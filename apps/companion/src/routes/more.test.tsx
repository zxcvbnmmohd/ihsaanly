// The More layout (list / list + pane), its index redirect and the
// remembered last page.
import { beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, resetApp, setWidth, startUsing } from '../../test/app'
import { MORE_PATHS } from '../more/last-page'

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

describe('compact', () => {
  it('/more is the list, with no redirect and no title above it', async () => {
    const app = await renderApp('/more')
    expect(await screen.findByPlaceholderText(en.more.search)).toBeInTheDocument()
    expect(app.router.state.location.pathname).toBe('/more')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('filters the list as you type, and says when nothing is left', async () => {
    const app = await renderApp('/more')
    const search = await screen.findByPlaceholderText(en.more.search)
    await app.user.type(search, 'lang')
    expect(screen.getAllByRole('link', { name: /Language/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /Appearance/ })).toBeNull()

    await app.user.clear(search)
    await app.user.type(search, 'qqqqqq')
    expect(await screen.findByText(en.library.noResults)).toBeInTheDocument()
  })

  it('opens a settings page from its row, as the whole screen', async () => {
    const app = await renderApp('/more')
    const [row] = await screen.findAllByRole('link', { name: /^Language/ })
    await app.user.click(row as HTMLElement)
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/language'))
    expect(screen.queryByPlaceholderText(en.more.search)).toBeNull()
    expect(await screen.findByRole('radio', { name: 'English' })).toBeInTheDocument()
  })

  it('lists Account, since this build has cloud sync', async () => {
    await renderApp('/more')
    expect((await screen.findAllByRole('link', { name: /^Account/ }))[0]).toHaveAttribute(
      'href',
      '/account',
    )
  })
})

describe('wide', () => {
  beforeEach(() => setWidth(1280))

  it('shows the list beside the page, titled, with the open row selected', async () => {
    await renderApp('/language')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.language.title }),
    ).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(en.more.search)).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: 'English' })).toBeInTheDocument()
  })

  it('titles every settings page', async () => {
    for (const path of MORE_PATHS) {
      const app = await renderApp(path)
      const heading = await screen.findByRole('heading', { level: 1 })
      expect(heading.textContent?.length).toBeGreaterThan(0)
      app.unmount()
    }
  })

  it('remembers the last page opened, and /more reopens it', async () => {
    const first = await renderApp('/hijri')
    await waitFor(() => expect(localStorage.getItem('ihsaanly.more.last')).toBe('/hijri'))
    first.unmount()

    const second = await renderApp('/more')
    expect(second.router.state.location.pathname).toBe('/hijri')
  })

  it('/more opens Location when nothing, or something unknown, was remembered', async () => {
    const empty = await renderApp('/more')
    expect(empty.router.state.location.pathname).toBe('/location')
    empty.unmount()

    localStorage.setItem('ihsaanly.more.last', '/not-a-page')
    const unknown = await renderApp('/more')
    expect(unknown.router.state.location.pathname).toBe('/location')
  })

  it('shows the pane without the list while restoring an account from onboarding', async () => {
    await resetApp()
    setWidth(1280)
    await renderApp('/account?from=onboarding')
    await screen.findByText(en.account.restore.intro)
    expect(screen.queryByPlaceholderText(en.more.search)).toBeNull()
    expect(within(document.body).queryByRole('link', { name: en.tabs.today })).toBeNull()
  })
})
