import { afterEach, beforeEach, expect, it } from 'bun:test'

const { startPopupContent } = await import('./content')
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
})

it('never checks without a content URL (the test build has none)', async () => {
  expect(import.meta.env.VITE_CONTENT_URL).toBeUndefined()
  stop = startPopupContent()
  await Bun.sleep(300)
  expect(requested).toEqual([])
})

it('checks soon after the popup opens', async () => {
  stop = startPopupContent('https://example.test/content')
  await Bun.sleep(300)
  expect(requested).toEqual(['https://example.test/content/manifest.json'])
})
