import { describe, expect, test } from 'bun:test'
import { firebaseConfigFrom } from './config'

const full = { apiKey: 'k', authDomain: 'a.firebaseapp.com', projectId: 'p', appId: 'app' }

describe('firebaseConfigFrom', () => {
  test('returns null when a required value is missing or blank', () => {
    expect(firebaseConfigFrom({})).toBeNull()
    expect(firebaseConfigFrom({ ...full, appId: '  ' })).toBeNull()
  })

  test('returns the config, with the emulator host only when set', () => {
    expect(firebaseConfigFrom(full)).toEqual(full)
    expect(firebaseConfigFrom({ ...full, emulatorHost: '127.0.0.1' })).toEqual({
      ...full,
      emulatorHost: '127.0.0.1',
    })
  })
})
