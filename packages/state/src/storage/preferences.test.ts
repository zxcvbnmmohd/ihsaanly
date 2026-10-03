import { beforeEach, describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { resetStorage } from '../../test/storage'

const backend = await import('./backend')
const { readPreference, writePreference } = await import('./preferences')
const { onLocalWrite } = await import('./local-writes')

const Count = z.number().int()

describe('preferences', () => {
  beforeEach(resetStorage)

  it('reads nothing for a key that was never written', () => {
    expect(readPreference('count', Count)).toBeNull()
  })

  it('round-trips a value through JSON and tells sync about the write', () => {
    const heard: (string | null)[] = []
    const stop = onLocalWrite((key) => heard.push(key))

    writePreference('count', 3)
    stop()

    expect(readPreference('count', Count)).toBe(3)
    expect(heard).toEqual(['count'])
  })

  it('treats a row that no longer fits its schema as missing', () => {
    backend.writePreferenceRow('count', '"three"')
    expect(readPreference('count', Count)).toBeNull()
  })

  it('treats a half-written row as missing instead of throwing', () => {
    backend.writePreferenceRow('count', '{"oops')
    expect(readPreference('count', Count)).toBeNull()
  })
})
