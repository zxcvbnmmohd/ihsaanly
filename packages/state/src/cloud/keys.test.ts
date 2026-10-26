import { expect, it } from 'bun:test'
import { isSyncedKey } from './keys'

it('carries the appearance with the account, and no longer the pre-themes accent', () => {
  expect(isSyncedKey('theme')).toBe(true)
  expect(isSyncedKey('accent')).toBe(false)
})
