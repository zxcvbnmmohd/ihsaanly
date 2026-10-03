import { describe, expect, test } from 'bun:test'
import { Timestamp } from 'firebase/firestore'
import type { SyncEvent } from '../ports'
import {
  eventKey,
  fromCursor,
  fromMonthDoc,
  fromPreferencesDoc,
  monthOf,
  parseEventKey,
  toCursor,
  toMonthDocs,
  toPreferencesMap,
} from './sync-remote'

const event = (overrides: Partial<SyncEvent> = {}): SyncEvent => ({
  kind: 'prayer',
  subject: 'fajr',
  at: 1_760_000_000_000,
  logDay: '2025-10-09',
  deltaSeconds: null,
  ...overrides,
})

describe('event keys', () => {
  test('month is the first seven characters of the log day', () => {
    expect(monthOf('2025-10-09')).toBe('2025-10')
  })

  test('round-trips, keeping a subject that contains | . and /', () => {
    const e = event({ subject: 'a|b.c/d' })
    expect(parseEventKey(eventKey(e))).toEqual({ at: e.at, kind: e.kind, subject: e.subject })
  })

  test('rejects keys without a numeric time or kind', () => {
    expect(parseEventKey('nope')).toBeNull()
    expect(parseEventKey('x|prayer|fajr')).toBeNull()
    expect(parseEventKey('|prayer|fajr')).toBeNull()
  })
})

describe('month docs', () => {
  test('groups by month and round-trips', () => {
    const events = [
      event(),
      event({ subject: 'dhuhr', deltaSeconds: 120 }),
      event({ at: 1, logDay: '2025-11-01' }),
    ]
    const docs = toMonthDocs(events)
    expect([...docs.keys()]).toEqual(['2025-10', '2025-11'])
    const back = [...docs.values()].flatMap((entries) => fromMonthDoc({ events: entries }))
    expect(back).toEqual(events)
  })

  test('skips malformed entries and tolerates junk documents', () => {
    const good = event()
    expect(
      fromMonthDoc({
        events: {
          [eventKey(good)]: { logDay: good.logDay, deltaSeconds: null },
          bad: { logDay: '2025-10-09', deltaSeconds: null },
          [eventKey(event({ subject: 'x' }))]: { logDay: 'oct', deltaSeconds: 'soon' },
          // Layout 1's single-letter fields are not read.
          [eventKey(event({ subject: 'y' }))]: { l: '2025-10-09', d: null },
        },
      }),
    ).toEqual([good])
    expect(fromMonthDoc(undefined)).toEqual([])
    expect(fromMonthDoc({ events: 'nope' })).toEqual([])
  })
})

describe('preferences doc', () => {
  test('round-trips and skips malformed entries', () => {
    const preferences = [{ key: 'theme.mode', value: '"dark"', updatedAt: 5 }]
    expect(toPreferencesMap(preferences)).toEqual({
      'theme.mode': { value: '"dark"', updatedAt: 5 },
    })
    expect(
      fromPreferencesDoc({
        preferences: { ...toPreferencesMap(preferences), broken: { value: 1 } },
      }),
    ).toEqual(preferences)
    expect(fromPreferencesDoc({ prefs: { a: { v: '1', t: 1 } } })).toEqual([])
    expect(fromPreferencesDoc(undefined)).toEqual([])
  })
})

describe('cursor', () => {
  test('keeps nanosecond precision', () => {
    const time = new Timestamp(1_760_000_000, 123_456_789)
    expect(fromCursor(toCursor(time))?.isEqual(time)).toBe(true)
  })

  test('anything unreadable means a full pull', () => {
    expect(fromCursor(null)).toBeNull()
    expect(fromCursor('1760000000000')).toBeNull()
  })
})
