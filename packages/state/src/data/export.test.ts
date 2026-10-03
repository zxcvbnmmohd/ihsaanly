import { beforeEach, describe, expect, it } from 'bun:test'
import { sqlite } from '../../test/native'
import { resetStorage } from '../../test/storage'

const backend = await import('../storage/backend')
const { recordEvent, recordEvents } = await import('../storage/events')
const { appendFailure } = await import('../storage/log')
const { setPlace } = await import('../location/store')
const { setNotificationPreferences } = await import('../notifications/store')
const { buildDiagnostics, buildExport } = await import('./export')

const app = { version: '1.2.3', platform: 'ios', osVersion: '18.1', device: 'iPhone' }
const reminders: { permission: 'granted'; pending: [] } = { permission: 'granted', pending: [] }

describe('buildExport', () => {
  beforeEach(resetStorage)

  it('names the format and carries every event, oldest first', () => {
    recordEvents([
      { kind: 'prayer-performed', subject: 'dhuhr', at: new Date(2_000), logDay: '2026-09-22' },
      { kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: '2026-09-22' },
    ])

    const exported = buildExport()

    expect(exported).toMatchObject({ format: 'ihsaanly-export', version: 1 })
    expect(exported.events.map((event) => event.subject)).toEqual(['fajr', 'dhuhr'])
    expect(new Date(exported.exportedAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("exports the user's settings and leaves sync bookkeeping out", () => {
    backend.writePreferenceRow('hijriOffset', '1')
    backend.writePreferenceRow('sync', '{}')
    backend.writePreferenceRow('account', '{"signedIn":true}')

    expect(buildExport().preferences).toEqual({ hijriOffset: 1 })
  })
})

describe('buildDiagnostics', () => {
  beforeEach(resetStorage)

  it('carries what the host supplied, untouched', () => {
    const diagnostics = buildDiagnostics(app, reminders)

    expect(diagnostics).toMatchObject({ format: 'ihsaanly-diagnostics', app, reminders })
    expect(diagnostics.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(diagnostics.locale).toBe(Intl.DateTimeFormat().resolvedOptions().locale)
  })

  it('has no coordinates until a place is chosen, then only about a hundred metres of them', () => {
    expect(buildDiagnostics(app, reminders).coordinates).toBeNull()

    setPlace({
      label: 'London',
      latitude: 51.50735,
      longitude: -0.12776,
      timeZone: 'Europe/London',
      source: 'city',
    })

    expect(buildDiagnostics(app, reminders).coordinates).toEqual({
      latitude: 51.507,
      longitude: -0.128,
    })
  })

  it('reports the UTC offset and daylight saving consistently with the clock', () => {
    const diagnostics = buildDiagnostics(app, reminders)
    const january = -new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset()
    const july = -new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset()

    expect(diagnostics.utcOffsetMinutes).toBe(-new Date().getTimezoneOffset())
    expect(diagnostics.daylightSaving).toBe(diagnostics.utcOffsetMinutes > Math.min(january, july))
  })

  it('includes notification preferences, failures, the last storage error and the data', () => {
    setNotificationPreferences({
      windows: false,
      lookAhead: false,
      prayers: true,
      quietHours: null,
      perItem: {},
      maxPerDay: 2,
    })
    appendFailure('somewhere', new Error('it broke'))
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })

    sqlite.db.exec('ALTER TABLE events RENAME TO events_hidden')
    let diagnostics: ReturnType<typeof buildDiagnostics>
    try {
      buildExport() // a read that fails is noted for the report that follows
      diagnostics = buildDiagnostics(app, reminders)
    } finally {
      sqlite.db.exec('ALTER TABLE events_hidden RENAME TO events')
    }

    expect(diagnostics.notifications).toMatchObject({ prayers: true, maxPerDay: 2 })
    expect(diagnostics.failures.map((entry) => entry.label)).toContain('somewhere')
    expect(diagnostics.lastStorageError).toContain('allActions')
    expect(diagnostics.data.events).toEqual([])
    expect(buildDiagnostics(app, reminders).data.events).toHaveLength(1)
  })
})
