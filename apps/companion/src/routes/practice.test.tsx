// To make up, History, About and Diagnostics: the pages that read the log.
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { getQadaBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { markPrayer } from '@ihsaanly/state/prayer/marks'
import { allActions } from '@ihsaanly/state/storage/events'
import { screen, waitFor } from '@testing-library/react'
import { LONDON, renderApp, resetApp, startUsing } from '../../test/app'

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

describe('To make up', () => {
  it('counts what is owed, then records make-ups against it', async () => {
    const app = await renderApp('/qada')
    const [owedUp] = await screen.findAllByRole('button', { name: `${en.qada.owed} +` })
    await app.user.click(owedUp as HTMLElement)
    await app.user.click(owedUp as HTMLElement)
    expect(await screen.findByText(en.qada.outstanding(2))).toBeInTheDocument()
    expect(getQadaBacklog().fajr).toBe(2)

    const [madeUp] = screen.getAllByRole('button', { name: `${en.qada.madeUp} +` })
    await app.user.click(madeUp as HTMLElement)
    await app.user.click(screen.getByRole('button', { name: en.qada.record(1) }))
    expect(await screen.findByText(en.qada.outstanding(1))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.qada.record(1) })).toBeNull()
    expect(allActions().filter((action) => action.kind === 'prayer-made-up')).toHaveLength(1)
  })

  it('does not record a make-up when none was set', async () => {
    await renderApp('/qada')
    await screen.findAllByRole('button', { name: `${en.qada.madeUp} +` })
    expect(screen.queryByRole('button', { name: en.qada.record(1) })).toBeNull()
  })

  it('counts owed fasts, and records one made up', async () => {
    const app = await renderApp('/qada')
    const record = await screen.findByRole('button', { name: en.fasting.recordMadeUp })
    expect(record).toBeDisabled()
    await app.user.click(record)
    expect(allActions().filter((action) => action.kind === 'fast-made-up')).toHaveLength(0)

    const buttons = screen.getAllByRole('button', { name: `${en.fasting.owed} +` })
    await app.user.click(buttons.at(-1) as HTMLElement)
    expect(await screen.findByText(en.fasting.outstanding(1))).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.fasting.recordMadeUp }))
    await waitFor(() => expect(screen.queryByText(en.fasting.outstanding(1))).toBeNull())
    expect(allActions().filter((action) => action.kind === 'fast-made-up')).toHaveLength(1)
  })

  it('records make-ups without a place, in UTC', async () => {
    await resetApp()
    await startUsing({ place: null })
    const app = await renderApp('/qada')
    const [madeUp] = await screen.findAllByRole('button', { name: `${en.qada.madeUp} +` })
    await app.user.click(madeUp as HTMLElement)
    await app.user.click(screen.getByRole('button', { name: en.qada.record(1) }))
    await waitFor(() =>
      expect(allActions().some((action) => action.kind === 'prayer-made-up')).toBe(true),
    )
  })
})

describe('History', () => {
  it('is empty before anything is recorded', async () => {
    await renderApp('/history')
    expect(await screen.findByText(en.history.empty)).toBeInTheDocument()
  })

  it('names the prayers and items recorded, and counts the days', async () => {
    markPrayer('fajr', new Date(), LONDON.timeZone)
    completeItem('dua-leaving-home', new Date(), LONDON.timeZone)
    await renderApp('/history')
    expect(await screen.findByText(en.history.daysActive(1))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${en.prayer.fajr}`))).toBeInTheDocument()
    expect(screen.getByText(/^Leaving home/)).toBeInTheDocument()
  })

  it('shows a record whose subject it no longer knows by that subject', async () => {
    const { recordEvent } = await import('@ihsaanly/state/storage/events')
    recordEvent({ kind: 'item-completed', subject: 'retired-item', at: new Date(), logDay: 'd' })
    await renderApp('/history')
    expect(await screen.findByText(/^retired-item/)).toBeInTheDocument()
  })
})

describe('About', () => {
  const original = window.open
  afterEach(() => {
    window.open = original
  })

  it('opens the legal pages and licences in a new tab', async () => {
    const opened: unknown[][] = []
    window.open = ((...args: unknown[]) => void opened.push(args)) as unknown as typeof window.open
    const app = await renderApp('/about')
    await app.user.click(await screen.findByRole('button', { name: /^Privacy policy/ }))
    await app.user.click(screen.getByRole('button', { name: /^Terms of use/ }))
    await app.user.click(screen.getByRole('button', { name: /^Amiri font/ }))
    await app.user.click(screen.getByRole('button', { name: /^City data/ }))
    expect(opened.map((call) => call[0])).toEqual([
      'https://ihsaanly.app/legal/privacy',
      'https://ihsaanly.app/legal/terms',
      'https://openfontlicense.org',
      'https://www.geonames.org/about.html',
    ])
    expect(opened.every((call) => call[1] === '_blank' && call[2] === 'noopener')).toBe(true)
  })

  it('says the apps are coming, rather than linking to a store listing that does not exist', async () => {
    const app = await renderApp('/about')
    await app.user.click(await screen.findByRole('button', { name: /App Store/ }))
    expect(await screen.findByText(en.web.getApp)).toBeInTheDocument()
  })
})

describe('Diagnostics', () => {
  const create = URL.createObjectURL
  const revoke = URL.revokeObjectURL
  const click = HTMLAnchorElement.prototype.click
  let downloads: string[]

  beforeEach(() => {
    downloads = []
    URL.createObjectURL = () => 'blob:diag'
    URL.revokeObjectURL = () => {}
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    }
  })

  afterEach(() => {
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    HTMLAnchorElement.prototype.click = click
  })

  it('summarises the device and shows the whole report on request', async () => {
    const app = await renderApp('/diagnostics')
    expect(await screen.findByText('web · Browser')).toBeInTheDocument()
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.diagnostics.showRaw }))
    expect(await screen.findByText(/"platform": "web"/)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.diagnostics.hideRaw }))
    await waitFor(() => expect(screen.queryByText(/"platform": "web"/)).toBeNull())
  })

  it('downloads the report and goes back when sent', async () => {
    const app = await renderApp('/data')
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.data.diagnostics}`) }),
    )
    await app.user.click(await screen.findByRole('button', { name: en.diagnostics.send }))
    expect(downloads).toEqual(['ihsaanly-diagnostics.json'])
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/data'))
  })

  it('goes back on "Not now", sending nothing', async () => {
    const app = await renderApp('/data')
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.data.diagnostics}`) }),
    )
    await app.user.click(await screen.findByRole('button', { name: en.diagnostics.cancel }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/data'))
    expect(downloads).toEqual([])
  })

  it('says so when the report cannot be downloaded, and stays', async () => {
    URL.createObjectURL = () => {
      throw new Error('no blobs')
    }
    const app = await renderApp('/diagnostics')
    await app.user.click(await screen.findByRole('button', { name: en.diagnostics.send }))
    expect(await screen.findByText(en.data.shareFailed)).toBeInTheDocument()
    expect(app.router.state.location.pathname).toBe('/diagnostics')
  })
})
