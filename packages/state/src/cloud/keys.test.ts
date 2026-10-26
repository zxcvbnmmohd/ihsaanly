import { expect, it } from 'bun:test'
import { isSyncedKey } from './keys'

it('carries the accent with the account, as it does the theme', () => {
  expect(isSyncedKey('theme')).toBe(true)
  expect(isSyncedKey('accent')).toBe(true)
})
