import { afterEach, describe, expect, test } from 'bun:test'
import { readStored, storeValue } from './local-storage.ts'

afterEach(() => {
  window.localStorage.clear()
})

describe('local storage', () => {
  test('stores, reads and removes a value', () => {
    expect(readStored('k')).toBeNull()
    storeValue('k', 'v')
    expect(readStored('k')).toBe('v')
    storeValue('k', null)
    expect(readStored('k')).toBeNull()
  })

  test('a throwing storage reads as empty and writes are ignored', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked')
      },
    })
    try {
      expect(readStored('k')).toBeNull()
      expect(() => storeValue('k', 'v')).not.toThrow()
      expect(() => storeValue('k', null)).not.toThrow()
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
    }
  })
})
