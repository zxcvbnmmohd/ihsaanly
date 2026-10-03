import { afterEach, beforeEach, expect, it } from 'bun:test'
import { AppState } from 'react-native'

const { removeContentRow } = await import('@ihsaanly/state/storage/backend')
const { startMobileContentUpdates } = await import('./updates')

const realFetch = globalThis.fetch
const realAddEventListener = AppState.addEventListener
const appState = { handlers: [] as ((state: string) => void)[], removed: 0 }
let requested: string[] = []
let stop: () => void = () => {}

beforeEach(() => {
  requested = []
  appState.handlers = []
  appState.removed = 0
  removeContentRow('checkedAt')
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested.push(String(input))
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  AppState.addEventListener = ((_type: string, handler: (state: string) => void) => {
    appState.handlers.push(handler)
    return {
      remove: () => {
        appState.removed += 1
      },
    }
  }) as typeof AppState.addEventListener
})
afterEach(() => {
  stop()
  globalThis.fetch = realFetch
  AppState.addEventListener = realAddEventListener
})

it('does nothing without a content URL (the test build has none)', () => {
  expect(process.env.EXPO_PUBLIC_CONTENT_URL).toBeUndefined()
  stop = startMobileContentUpdates()
  expect(appState.handlers).toEqual([])
})

it('checks when the app comes to the foreground, and unsubscribes when stopped', async () => {
  stop = startMobileContentUpdates('https://example.test/content')
  expect(appState.handlers).toHaveLength(1)

  appState.handlers[0]?.('background')
  await Bun.sleep(0)
  expect(requested).toEqual([])

  appState.handlers[0]?.('active')
  await Bun.sleep(0)
  expect(requested).toEqual(['https://example.test/content/manifest.json'])

  stop()
  stop = () => {}
  expect(appState.removed).toBe(1)
})
