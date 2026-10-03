import { beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

describe('the onboarding gate', () => {
  beforeEach(resetApp)

  it('sends the door to the first onboarding step until onboarding is done', async () => {
    const app = await renderApp('/')
    expect(app.router.state.location.pathname).toBe('/onboarding/welcome')
  })

  it('sends any app URL to the first step too, a shared item link included', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    expect(app.router.state.location.pathname).toBe('/onboarding/welcome')
  })

  it('sends the door to Today once onboarding is done', async () => {
    await startUsing()
    const app = await renderApp('/')
    expect(app.router.state.location.pathname).toBe('/today')
  })

  it('lets /account through, as the restore flow, without the tab bar', async () => {
    const app = await renderApp('/account')
    expect(app.router.state.location.pathname).toBe('/account')
    expect(app.router.state.location.search).toEqual({ from: 'onboarding' })
    expect(screen.queryByRole('link', { name: en.tabs.today })).toBeNull()
  })

  it('sends /onboarding to its first step', async () => {
    const app = await renderApp('/onboarding')
    expect(app.router.state.location.pathname).toBe('/onboarding/welcome')
  })

  it('sends a finished onboarding step URL to Today, and an unknown step to the first', async () => {
    const fresh = await renderApp('/onboarding/nonsense')
    expect(fresh.router.state.location.pathname).toBe('/onboarding/welcome')
    fresh.unmount()

    await startUsing()
    const done = await renderApp('/onboarding/how')
    expect(done.router.state.location.pathname).toBe('/today')
  })
})

describe('the app shell', () => {
  beforeEach(async () => {
    await resetApp()
    await startUsing()
  })

  it('shows the three tabs twice, in the sidebar and the bottom bar, with the current one marked', async () => {
    await renderApp('/today')
    const today = await screen.findAllByRole('link', { name: en.tabs.today })
    expect(today).toHaveLength(2)
    for (const link of today) expect(link).toHaveAttribute('aria-current', 'page')
    for (const label of [en.tabs.library, en.tabs.more]) {
      for (const link of screen.getAllByRole('link', { name: label })) {
        expect(link).not.toHaveAttribute('aria-current')
      }
    }
  })

  it('marks Library for any page inside it, and More for any settings page', async () => {
    const library = await renderApp('/glossary')
    expect(screen.getAllByRole('link', { name: en.tabs.library })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
    library.unmount()

    await renderApp('/about')
    expect(screen.getAllByRole('link', { name: en.tabs.more })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('moves between tabs on a plain click, without a page load', async () => {
    const app = await renderApp('/today')
    await app.user.click(
      (await screen.findAllByRole('link', { name: en.tabs.library }))[0] as HTMLElement,
    )
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/library'))
  })

  it('leaves a modified click to the browser', async () => {
    const app = await renderApp('/today')
    const [link] = await screen.findAllByRole('link', { name: en.tabs.library })
    await app.user.keyboard('{Control>}')
    await app.user.click(link as HTMLElement)
    await app.user.keyboard('{/Control}')
    expect(app.router.state.location.pathname).toBe('/today')
  })

  it('answers an unknown URL with the not-found page inside the shell', async () => {
    const app = await renderApp('/nowhere')
    expect(await screen.findByText(en.notFound.body)).toBeInTheDocument()
    expect(app.router.state.location.pathname).toBe('/nowhere')
    await app.user.click(
      within(screen.getByRole('main')).getByRole('link', { name: en.tabs.today }),
    )
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/today'))
  })
})
