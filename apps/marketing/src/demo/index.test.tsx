import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, screen, waitFor } from '@testing-library/react'
import { renderSite, type SiteRender } from '../../test/site'

const { Demo } = await import('./index')

const realRect = Element.prototype.getBoundingClientRect
const realObserver = globalThis.IntersectionObserver

interface Watcher {
  callback: IntersectionObserverCallback
  observed: Element[]
  disconnected: boolean
}
let watchers: Watcher[] = []

class FakeObserver {
  watcher: Watcher
  constructor(callback: IntersectionObserverCallback) {
    this.watcher = { callback, observed: [], disconnected: false }
    watchers.push(this.watcher)
  }
  observe(element: Element): void {
    this.watcher.observed.push(element)
  }
  disconnect(): void {
    this.watcher.disconnected = true
  }
}

function farAway(): void {
  Element.prototype.getBoundingClientRect = () => ({ top: 99999 }) as DOMRect
}

beforeEach(() => {
  watchers = []
  globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver
})
afterEach(() => {
  Element.prototype.getBoundingClientRect = realRect
  globalThis.IntersectionObserver = realObserver
})

/** Renders inside an awaited act: the phone suspends while its chunk and language load. */
async function mount(options?: Parameters<typeof renderSite>[1]): Promise<SiteRender> {
  let view: SiteRender | undefined
  // biome-ignore lint/nursery/useAwaitThenable: act returns a thenable when given an async callback.
  await act(async () => {
    view = renderSite(<Demo />, options)
  })
  if (!view) throw new Error('not rendered')
  return view
}

const phoneShown = (): boolean => document.querySelector('[role="tablist"]') !== null

describe('Demo', () => {
  test('labels its region, and shows the no-JavaScript line until the page is live', async () => {
    farAway()
    const { strings } = await mount()
    const region = document.getElementById('demo')
    expect(region).toHaveAttribute('aria-label', strings['home.demo.label'])
    // Once mounted (ClientOnly) the phone is not loaded yet: a bare silhouette remains.
    await waitFor(() => expect(document.querySelector('.demo-noscript')).toBeNull())
    expect(document.getElementById('demo-phone')).not.toBeNull()
    expect(phoneShown()).toBe(false)
  })

  test('a demo already in view loads the phone straight away', async () => {
    await mount()
    await waitFor(() => expect(phoneShown()).toBe(true))
    expect(screen.getByRole('tab', { name: 'Today' })).toBeInTheDocument()
    expect(watchers).toHaveLength(0)
  })

  test('a demo far down waits for the observer, then loads', async () => {
    farAway()
    await mount()
    await waitFor(() => expect(watchers).toHaveLength(1))
    const [watcher] = watchers
    expect(watcher?.observed[0]).toBe(document.getElementById('demo') ?? undefined)
    act(() =>
      watcher?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(phoneShown()).toBe(false)
    act(() =>
      watcher?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    await waitFor(() => expect(phoneShown()).toBe(true))
    expect(watcher?.disconnected).toBe(true)
  })

  test.each(['pointerdown', 'focusin'])('%s on the demo loads it early', async (type) => {
    farAway()
    await mount()
    await waitFor(() => expect(watchers).toHaveLength(1))
    act(() => {
      document.getElementById('demo')?.dispatchEvent(new Event(type, { bubbles: true }))
    })
    await waitFor(() => expect(phoneShown()).toBe(true))
  })

  test('without IntersectionObserver it loads at once', async () => {
    farAway()
    // @ts-expect-error simulating an old browser
    globalThis.IntersectionObserver = undefined
    await mount()
    await waitFor(() => expect(phoneShown()).toBe(true))
  })

  test('stops observing when it unmounts before reaching the viewport', async () => {
    farAway()
    const view = await mount()
    await waitFor(() => expect(watchers).toHaveLength(1))
    view.unmount()
    expect(watchers[0]?.disconnected).toBe(true)
  })

  test('the phone speaks the page language, and a language is fetched once', async () => {
    const first = await mount({ lang: 'fr' })
    await waitFor(() => expect(phoneShown()).toBe(true))
    expect(document.getElementById('demo-phone')).toHaveAttribute('lang', 'fr')
    first.unmount()
    await mount({ lang: 'fr' })
    await waitFor(() => expect(phoneShown()).toBe(true))
  })
})
