import { expect, it } from 'bun:test'
import { openSystemSettings } from './open-settings'

it('does nothing: a browser tab has no system settings to open', () => {
  expect(openSystemSettings()).toBeUndefined()
})
