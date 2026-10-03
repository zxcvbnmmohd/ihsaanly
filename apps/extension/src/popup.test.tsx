import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { Cloud } from '@ihsaanly/cloud/ports'
import { screen, waitFor } from '@testing-library/react'
import type { Root } from 'react-dom/client'
import { fakeChrome } from '../test/chrome'
import { resetApp, strings } from '../test/route'
import { resetSession, sessionCalls, startArgs } from '../test/session-mock'
import { OPEN_ROUTE_KEY } from './alarms'
import { router } from './router'

// The popup renders with a plain createRoot, outside Testing Library's act.
const actFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
const wasActEnvironment = actFlag.IS_REACT_ACT_ENVIRONMENT

// ./cloud is what the build variables made it (local-only) except where a test says otherwise.
// A snapshot: the namespace itself follows a mock.
const realCloud = { ...(await import('./cloud')) }
const { startPopup: start } = await import('./popup')

const roots: Root[] = []
function startPopup(container: HTMLElement | null): Root {
  const root = start(container)
  roots.push(root)
  return root
}

function mountRoot(): HTMLElement {
  document.body.innerHTML = '<div id="root"></div>'
  const root = document.getElementById('root')
  if (!root) throw new Error('no root')
  return root
}

beforeEach(() => {
  resetApp()
  resetSession()
  actFlag.IS_REACT_ACT_ENVIRONMENT = false
  window.history.replaceState(null, '', '/')
  document.documentElement.className = ''
})
afterEach(async () => {
  // The router is one instance for the whole popup: send it home while it is still mounted.
  if (roots.length > 0) await router.navigate({ href: '/' })
  for (const root of roots.splice(0)) root.unmount()
  document.body.innerHTML = ''
  actFlag.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment
})

describe('startPopup', () => {
  it('starts item progress, so a mark on Today is kept', async () => {
    const { addCount, getItemProgress } = await import('@ihsaanly/state/progress/store')
    startPopup(mountRoot())
    await screen.findByRole('heading', { name: strings.today.title })
    addCount('morning-adhkar')
    expect(getItemProgress('morning-adhkar').count).toBe(1)
  })

  it('refuses to start without its mount point', () => {
    expect(() => startPopup(null)).toThrow('popup.html is missing #root')
  })

  it('renders Today, and in a local-only build never starts the cloud', async () => {
    startPopup(mountRoot())
    expect(await screen.findByRole('heading', { name: strings.today.title })).toBeInTheDocument()
    expect(startArgs).toBeNull()
    // Closing the popup has nothing to detach when no account is wired.
    window.dispatchEvent(new Event('pagehide'))
    expect(sessionCalls).toEqual([])
    expect(document.documentElement.classList.contains('tab')).toBe(false)
  })

  it('installs the content downloaded on an earlier open before it renders', async () => {
    const { saveCachedContent, clearCachedContent } = await import('@ihsaanly/state/content/cache')
    const { default: english } = await import('@ihsaanly/core/content/items.json')
    const { default: glossary } = await import('@ihsaanly/core/content/glossary.json')
    const core = await import('@ihsaanly/core/content')
    const [first, ...rest] = english.items
    if (!first) throw new Error('no items')
    saveCachedContent({
      version: 'aaaaaaaaaaaa',
      language: 'en',
      items: { ...english, items: [{ ...first, title: { en: 'Downloaded title' } }, ...rest] },
      glossary,
      translations: {},
    })
    try {
      startPopup(mountRoot())
      expect(core.itemById(first.id)?.title.en).toBe('Downloaded title')
      await screen.findByRole('heading', { name: strings.today.title })
    } finally {
      clearCachedContent()
      core.resetContent()
    }
  })

  it('drops the popup frame when opened as a tab', () => {
    window.history.replaceState(null, '', '/?tab')
    startPopup(mountRoot())
    expect(document.documentElement.classList.contains('tab')).toBe(true)
  })

  it('lands on the route a notification click left, once', async () => {
    await fakeChrome.session.set({ [OPEN_ROUTE_KEY]: '/appearance' })
    startPopup(mountRoot())

    await screen.findByRole('heading', { name: strings.appearance.title })
    expect(window.location.hash).toBe('#/appearance')
    await waitFor(() => expect(fakeChrome.session.data.has(OPEN_ROUTE_KEY)).toBe(false))
  })

  it('ignores a stored route that is not a string', async () => {
    await fakeChrome.session.set({ [OPEN_ROUTE_KEY]: 42 })
    startPopup(mountRoot())
    await screen.findByRole('heading', { name: strings.today.title })
    expect(fakeChrome.session.data.get(OPEN_ROUTE_KEY)).toBe(42)
  })
})

// Never used as a cloud: only its identity is asserted.
const fakeCloud = {} as Cloud

describe('startPopup in a build with an account', () => {
  const fakeLoad = async (): Promise<Cloud> => fakeCloud

  beforeEach(() => {
    mock.module('./cloud', () => ({ cloudEnabled: true, loadCloud: fakeLoad }))
  })
  afterAll(() => {
    mock.module('./cloud', () => realCloud)
  })

  it('starts the cloud, and reloads the popup after a wipe', async () => {
    const reload = spyOn(window.location, 'reload').mockImplementation(() => {})
    startPopup(mountRoot())
    await screen.findByRole('heading', { name: strings.today.title })

    expect(startArgs?.load).toBe(fakeLoad)
    expect(reload).not.toHaveBeenCalled()
    startArgs?.options.onWiped?.()
    expect(reload).toHaveBeenCalledTimes(1)
    reload.mockRestore()
  })

  it('stops listening for sync when the popup closes', async () => {
    startPopup(mountRoot())
    await screen.findByRole('heading', { name: strings.today.title })
    expect(sessionCalls).toEqual([])
    window.dispatchEvent(new Event('pagehide'))
    expect(sessionCalls).toEqual([{ name: 'notifyBackground', args: [] }])
  })
})
