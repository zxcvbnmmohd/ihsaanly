import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { act, screen } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'
import { registerServiceWorker } from '../register-sw'

const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
const originalMatchMedia = window.matchMedia

function userAgent(value: string): void {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value })
}

function standalone(installed: boolean): void {
  window.matchMedia = ((query: string) => ({
    ...originalMatchMedia.call(window, query),
    matches: installed && query === '(display-mode: standalone)',
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as typeof window.matchMedia
}

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

afterEach(() => {
  if (originalUserAgent) Object.defineProperty(navigator, 'userAgent', originalUserAgent)
  else Reflect.deleteProperty(navigator, 'userAgent')
  window.matchMedia = originalMatchMedia
})

describe('AppBanner', () => {
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile'

  it('offers the Android app in a normal tab, linking to the intent for this page', async () => {
    userAgent(ANDROID)
    standalone(false)
    await renderApp('/today')
    const link = await screen.findByRole('link', { name: en.web.openInApp })
    expect(link.getAttribute('href')).toStartWith('intent://today#Intent;scheme=')
  })

  it('stays away on other platforms and once installed', async () => {
    userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605')
    standalone(false)
    const desktop = await renderApp('/today')
    expect(screen.queryByRole('link', { name: en.web.openInApp })).toBeNull()
    desktop.unmount()

    userAgent(ANDROID)
    standalone(true)
    await renderApp('/today')
    expect(screen.queryByRole('link', { name: en.web.openInApp })).toBeNull()
  })

  it('is dismissed for good with the close button', async () => {
    userAgent(ANDROID)
    standalone(false)
    const app = await renderApp('/today')
    await app.user.click(await screen.findByRole('button', { name: en.web.dismiss }))
    expect(screen.queryByRole('link', { name: en.web.openInApp })).toBeNull()
    expect(localStorage.getItem('ihsaanly.app-banner-dismissed')).toBe('1')
    app.unmount()

    await renderApp('/today')
    expect(screen.queryByRole('link', { name: en.web.openInApp })).toBeNull()
  })
})

describe('UpdateBanner', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

  class Worker {
    state = 'installing'
    messages: unknown[] = []
    private listeners: (() => void)[] = []
    addEventListener(_type: string, listener: () => void): void {
      this.listeners.push(listener)
    }
    postMessage(message: unknown): void {
      this.messages.push(message)
    }
    install(): void {
      this.state = 'installed'
      for (const listener of this.listeners) listener()
    }
  }

  /** Registers with a fake service worker API and lets a new worker finish installing. */
  async function offerUpdate(): Promise<Worker> {
    const worker = new Worker()
    let found: () => void = () => {}
    const registration = {
      installing: worker,
      addEventListener: (_type: string, listener: () => void) => {
        found = listener
      },
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: {}, register: () => Promise.resolve(registration) },
    })
    registerServiceWorker()
    // biome-ignore lint/nursery/useAwaitThenable: an async act() returns a promise.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      found()
      worker.install()
    })
    return worker
  }

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'serviceWorker', original)
    else Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('shows nothing until a worker is waiting', async () => {
    await renderApp('/today')
    expect(screen.queryByText(en.web.updateReady)).toBeNull()
  })

  it('asks the waiting worker to take over on Reload, and reloads once it has', async () => {
    const app = await renderApp('/today')
    const worker = await offerUpdate()
    expect(await screen.findByText(en.web.updateReady)).toBeInTheDocument()

    let reloads = 0
    Object.defineProperty(window.location, 'reload', {
      configurable: true,
      value: () => {
        reloads += 1
      },
    })
    await app.user.click(screen.getByRole('button', { name: en.web.reload }))
    expect(worker.messages).toEqual([{ type: 'SKIP_WAITING' }])
    expect(reloads).toBe(0)
    // Once the worker has taken over, the page reloads onto it.
    worker.install()
    expect(reloads).toBe(1)
  })

  it('hides for this visit on Dismiss', async () => {
    const app = await renderApp('/today')
    await offerUpdate()
    await app.user.click(await screen.findByRole('button', { name: en.web.dismiss }))
    expect(screen.queryByText(en.web.updateReady)).toBeNull()
  })
})
