import { afterEach, expect, it } from 'bun:test'
import { openUrl } from './open-url'

const original = window.open

afterEach(() => {
  window.open = original
})

it('opens the page in a new tab, without an opener', () => {
  const calls: unknown[][] = []
  window.open = ((...args: unknown[]) => void calls.push(args)) as unknown as typeof window.open
  openUrl('https://ihsaanly.app/legal/terms')
  expect(calls).toEqual([['https://ihsaanly.app/legal/terms', '_blank', 'noopener']])
})
