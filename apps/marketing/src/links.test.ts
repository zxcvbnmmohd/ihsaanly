import { expect, test } from 'bun:test'
import { COMPANION_URL } from './links'

test('the companion web app URL is an https origin (production default when unset)', () => {
  expect(COMPANION_URL).toBe(process.env.VITE_COMPANION_URL || 'https://companion.ihsaanly.app')
  expect(new URL(COMPANION_URL).protocol).toBe('https:')
})
