import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { getEnabledItems, setEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { allActions } from '@ihsaanly/state/storage/events'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

// Tuesday midday in London: Morning adhkar is open, so the screen has a plan to read.
beforeEach(async () => {
  setSystemTime(new Date('2026-03-02T12:00:00Z'))
  await resetApp()
  await startUsing()
  setEnabledItems(['dua-leaving-home', 'tasbih-after-prayer', 'morning-adhkar'])
})

afterEach(() => {
  setSystemTime()
})

const completions = (id: string): number =>
  allActions().filter((action) => action.kind === 'item-completed' && action.subject === id).length

describe('an item', () => {
  it('shows what it is, with its ruling linking to the glossary', async () => {
    await renderApp('/item/dua-leaving-home')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Leaving home' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sunnah' })[0]).toHaveAttribute(
      'href',
      '/glossary?term=sunnah',
    )
    expect(screen.getAllByRole('link', { name: en.memorise.start })[0]).toHaveAttribute(
      'href',
      '/item/memorise/dua-leaving-home',
    )
  })

  it('offers no practising for an item with no Arabic', async () => {
    await renderApp('/item/sunnah-before-fajr')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: en.memorise.start })).toBeNull()
  })

  it('is "Not found" for an unknown id, with nothing to do', async () => {
    await renderApp('/item/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.notFound.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.item.done })).toBeNull()
  })

  it('records Done in the log and takes it back with Undo', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    await app.user.click(await screen.findByRole('button', { name: en.item.done }))
    expect(completions('dua-leaving-home')).toBe(1)
    await app.user.click(await screen.findByRole('button', { name: en.item.undo }))
    expect(await screen.findByRole('button', { name: en.item.done })).toBeInTheDocument()
    expect(
      allActions().filter(
        (action) => action.kind === 'item-uncompleted' && action.subject === 'dua-leaving-home',
      ),
    ).toHaveLength(1)
  })

  it('completes a repeated item when the counter reaches its target, and starts again on request', async () => {
    const app = await renderApp('/item/tasbih-after-prayer')
    const target = itemById('tasbih-after-prayer')?.repeat ?? 0
    expect(target).toBeGreaterThan(1)
    const counter = await screen.findByRole('button', { name: 'Tasbih after prayer' })

    await app.user.click(counter)
    await app.user.click(counter)
    expect(completions('tasbih-after-prayer')).toBe(0)
    await app.user.click(screen.getByRole('button', { name: en.item.counterReset }))

    for (let tap = 0; tap < target; tap += 1) await app.user.click(counter)
    expect(completions('tasbih-after-prayer')).toBe(1)
  })

  it('adds the item to Today, and takes it off', async () => {
    setEnabledItems([])
    const app = await renderApp('/item/dua-leaving-home')
    await app.user.click(await screen.findByRole('switch', { name: en.item.onToday }))
    expect(getEnabledItems()).toEqual(['dua-leaving-home'])
    await app.user.click(screen.getByRole('switch', { name: en.item.onToday }))
    expect(getEnabledItems()).toEqual([])
  })

  it('has a reminder switch only for items that open a window or a day, and saves it per item', async () => {
    const plain = await renderApp('/item/dua-leaving-home')
    await screen.findByRole('switch', { name: en.item.onToday })
    expect(screen.queryByRole('switch', { name: en.item.remind })).toBeNull()
    plain.unmount()

    const app = await renderApp('/item/morning-adhkar')
    const before = getNotificationPreferences().perItem['morning-adhkar']
    await app.user.click(await screen.findByRole('switch', { name: en.item.remind }))
    expect(getNotificationPreferences().perItem['morning-adhkar']).toBe(
      before === undefined ? false : !before,
    )
  })
})

describe('sharing', () => {
  const nav = navigator as unknown as Record<string, unknown>
  const original = nav.share
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: original })
  })

  it('hands the same text to the share sheet from either button', async () => {
    const shared: { text?: string }[] = []
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { text?: string }) => void shared.push(data),
    })
    const app = await renderApp('/item/dua-leaving-home')
    await app.user.click(await screen.findByRole('button', { name: en.item.shareText }))
    await app.user.click(screen.getByRole('button', { name: en.item.shareImage }))
    await waitFor(() => expect(shared).toHaveLength(2))
    expect(shared[0]?.text).toContain('Leaving home')
    expect(shared[0]).toEqual(shared[1] as never)
  })

  it('does nothing for an unknown item', async () => {
    const shared: unknown[] = []
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: unknown) => void shared.push(data),
    })
    await renderApp('/item/nope')
    await screen.findByRole('heading', { level: 1, name: en.notFound.title })
    expect(shared).toEqual([])
  })
})
