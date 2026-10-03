import { afterEach, beforeEach, expect, it } from 'bun:test'

const { startCompanionContent } = await import('./content')
const { removeContentRow } = await import('@ihsaanly/state/storage/backend')

const realFetch = globalThis.fetch
let requested: string[] = []
let stop: () => void = () => {}

beforeEach(() => {
  requested = []
  removeContentRow('checkedAt')
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested.push(String(input))
    return new Response('{}', { status: 404 })
  }) as typeof fetch
})
afterEach(() => {
  stop()
  globalThis.fetch = realFetch
  Reflect.deleteProperty(document, 'visibilityState')
})

it('never checks without a content URL (the test build has none)', () => {
  expect(import.meta.env.VITE_CONTENT_URL).toBeUndefined()
  stop = startCompanionContent()
  document.dispatchEvent(new Event('visibilitychange'))
  expect(requested).toEqual([])
})

it('checks when the tab comes back, and stops listening when stopped', async () => {
  stop = startCompanionContent('https://example.test/content')
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  expect(requested).toEqual([])

  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  await Bun.sleep(0)
  expect(requested).toEqual(['https://example.test/content/manifest.json'])

  stop()
  stop = () => {}
  document.dispatchEvent(new Event('visibilitychange'))
  await Bun.sleep(0)
  expect(requested).toHaveLength(1)
})
