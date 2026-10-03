import { afterEach, expect, it } from 'bun:test'
import { shareText } from './share-text'

const nav = navigator as unknown as Record<string, unknown>
const originalShare = nav.share
const originalClipboard = nav.clipboard

afterEach(() => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
})

function define(key: 'share' | 'clipboard', value: unknown): void {
  Object.defineProperty(navigator, key, { configurable: true, value })
}

it('uses the share sheet where there is one', async () => {
  const shared: unknown[] = []
  define('share', async (data: unknown) => void shared.push(data))
  expect(await shareText('hello')).toBe(true)
  expect(shared).toEqual([{ text: 'hello' }])
})

it('reports false when the share sheet is cancelled, without falling back to the clipboard', async () => {
  const written: string[] = []
  define('share', () => Promise.reject(new DOMException('cancelled', 'AbortError')))
  define('clipboard', { writeText: async (text: string) => void written.push(text) })
  expect(await shareText('hello')).toBe(false)
  expect(written).toEqual([])
})

it('copies to the clipboard when there is no share sheet', async () => {
  const written: string[] = []
  define('share', undefined)
  define('clipboard', { writeText: async (text: string) => void written.push(text) })
  expect(await shareText('hello')).toBe(true)
  expect(written).toEqual(['hello'])
})

it('reports false when the clipboard refuses', async () => {
  define('share', undefined)
  define('clipboard', { writeText: () => Promise.reject(new Error('denied')) })
  expect(await shareText('hello')).toBe(false)
})
