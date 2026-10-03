import { expect, test } from 'bun:test'
import * as cloud from './index'

test('the entry point exposes the engine and the ports, and no provider', () => {
  expect(typeof cloud.otherProvider).toBe('function')
  expect(typeof cloud.LinkRequiredError).toBe('function')
  expect(Object.keys(cloud).some((name) => /firebase/i.test(name))).toBe(false)
})
