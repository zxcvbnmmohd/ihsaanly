import { beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { setKnownItems } from '@ihsaanly/state/memorise/store'
import { setEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, setWidth, startUsing } from '../../test/app'

beforeEach(async () => {
  await resetApp()
  await startUsing()
  setEnabledItems(['dua-leaving-home', 'morning-adhkar'])
  setKnownItems([])
})

const link = (name: RegExp | string): Promise<HTMLElement> =>
  screen.findAllByRole('link', { name }).then(([first]) => first as HTMLElement)

describe('compact', () => {
  it('is the grid with its own header and no back button', async () => {
    await renderApp('/library')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.library.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
    expect(await link(/^Leaving home/)).toHaveAttribute('href', '/item/dua-leaving-home')
  })

  it('searches by name, and says when nothing matches', async () => {
    const app = await renderApp('/library')
    const search = await screen.findByPlaceholderText(en.library.search)
    await app.user.type(search, 'leaving')
    expect(await link(/^Leaving home/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Morning adhkar/ })).toBeNull()

    await app.user.clear(search)
    await app.user.type(search, 'zzzzzz')
    expect(await screen.findByText(en.library.noResults)).toBeInTheDocument()
  })

  it('filters to what is on Today, and to what is known', async () => {
    setKnownItems(['dua-eating'])
    const app = await renderApp('/library')
    await app.user.click(await screen.findByRole('button', { name: /^On Today/ }))
    expect(await link(/^Leaving home/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Tasbih after prayer/ })).toBeNull()

    await app.user.click(screen.getByRole('button', { name: /^Known/ }))
    expect(await link(/^Before eating/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Leaving home/ })).toBeNull()
  })

  it('opens an item as the whole screen and the glossary from its link', async () => {
    const app = await renderApp('/library')
    await app.user.click(await link(/^Leaving home/))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/item/dua-leaving-home'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Leaving home' }),
    ).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(en.library.search)).toBeNull()
  })

  it('opens the glossary', async () => {
    const app = await renderApp('/library')
    await app.user.click(await link(/^Glossary/))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/glossary'))
    expect(
      await screen.findByRole('heading', { level: 1, name: en.glossary.title }),
    ).toBeInTheDocument()
  })
})

describe('wide', () => {
  beforeEach(() => setWidth(1280))

  it('keeps the grid and shows no panel until something is open', async () => {
    await renderApp('/library')
    expect(await screen.findByPlaceholderText(en.library.search)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('opens an item in a panel beside the grid, titled after it', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    expect(await screen.findByPlaceholderText(en.library.search)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: en.panel.close })).toBeInTheDocument()
    expect(screen.getAllByText('Leaving home').length).toBeGreaterThan(1)
    expect(app.router.state.location.pathname).toBe('/item/dua-leaving-home')
  })

  it('titles the panel for an unknown item, the glossary and learning', async () => {
    const unknown = await renderApp('/item/nope')
    expect((await screen.findAllByText(en.notFound.title)).length).toBeGreaterThan(0)
    unknown.unmount()

    const glossary = await renderApp('/glossary')
    expect((await screen.findAllByText(en.glossary.title)).length).toBeGreaterThan(0)
    glossary.unmount()

    await renderApp('/item/memorise/dua-leaving-home')
    expect((await screen.findAllByText(en.memorise.title)).length).toBeGreaterThan(0)
  })

  it('closes the panel with Escape', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    await screen.findByPlaceholderText(en.library.search)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(app.router.state.location.pathname).toBe('/item/dua-leaving-home')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/library'))
  })

  it('closes the panel from its close control', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    await screen.findByPlaceholderText(en.library.search)
    const close = await screen.findByRole('button', { name: en.panel.close })
    await app.user.click(close)
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/library'))
  })
})
