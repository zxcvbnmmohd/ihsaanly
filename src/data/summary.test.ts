import { describe, expect, it } from 'bun:test'

import type { Diagnostics } from './export'
import { formatCoordinates, summarise } from './summary'

const diagnostics: Diagnostics = {
  format: 'ihsaanly-diagnostics',
  generatedAt: '2026-09-21T10:00:00.000Z',
  app: { version: '1.0.0', platform: 'ios', osVersion: '18.1', device: 'Apple iPhone' },
  locale: 'en-GB',
  timeZone: 'Europe/London',
  utcOffsetMinutes: 60,
  daylightSaving: true,
  coordinates: { latitude: 51.501, longitude: -0.142 },
  notifications: {
    windows: true,
    lookAhead: true,
    prayers: false,
    quietHours: null,
    perItem: {},
    maxPerDay: 3,
  },
  reminders: { permission: 'granted', pending: [] },
  lastStorageError: null,
  data: {
    format: 'ihsaanly-export',
    version: 1,
    exportedAt: '2026-09-21T10:00:00.000Z',
    preferences: { place: {}, onboarding: {} },
    events: [
      { kind: 'prayer-performed', subject: 'fajr', at: 1, logDay: '2026-09-21', deltaSeconds: 0 },
      { kind: 'item-completed', subject: 'witr', at: 2, logDay: '2026-09-21', deltaSeconds: null },
    ],
  },
}

describe('summarise', () => {
  it('counts what is actually in the bundle', () => {
    const summary = summarise(diagnostics)

    expect(summary.records).toBe(2)
    expect(summary.settings).toBe(2)
    expect(summary.version).toBe('1.0.0')
  })

  it('names the device and platform together', () => {
    expect(summarise(diagnostics).device).toBe('Apple iPhone · ios 18.1')
  })

  it('reports coordinates only when there are some', () => {
    expect(summarise(diagnostics).coordinates).toEqual({ latitude: 51.501, longitude: -0.142 })
    expect(summarise({ ...diagnostics, coordinates: null }).coordinates).toBeNull()
  })

  it('flags a stored error so the preview can say so', () => {
    expect(summarise(diagnostics).hasError).toBe(false)
    expect(summarise({ ...diagnostics, lastStorageError: 'disk full' }).hasError).toBe(true)
  })
})

describe('formatCoordinates', () => {
  it('shows the bundle values unchanged, since rounding happened when it was built', () => {
    expect(formatCoordinates({ latitude: 51.501, longitude: -0.142 })).toBe('51.501, -0.142')
  })
})
