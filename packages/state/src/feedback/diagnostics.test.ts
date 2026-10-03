import { beforeEach, describe, expect, it } from 'bun:test'
import { resetStorage } from '../../test/storage'
import type { Diagnostics } from '../data/export'

const { recordEvents } = await import('../storage/events')
const { appendFailure } = await import('../storage/log')
const backend = await import('../storage/backend')
const { setPlace } = await import('../location/store')
const { buildDiagnostics } = await import('../data/export')
const { FEEDBACK_FAILURE_LIMIT, buildFeedbackDiagnostics, trimDiagnostics } = await import(
  './diagnostics'
)

const app = { version: '1.2.3', platform: 'ios', osVersion: '18.1', device: 'iPhone' }
const reminders = {
  permission: 'granted' as const,
  pending: [
    { id: 'a', at: null },
    { id: 'b', at: '2026-01-01T00:00:00Z' },
  ],
}

describe('buildFeedbackDiagnostics', () => {
  beforeEach(resetStorage)

  it('keeps the context and summarises the data without any of it', () => {
    recordEvents([
      { kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: '2026-09-21' },
      { kind: 'prayer-performed', subject: 'dhuhr', at: new Date(2_000), logDay: '2026-09-22' },
      { kind: 'item-completed', subject: 'duha', at: new Date(3_000), logDay: '2026-09-22' },
    ])
    backend.writePreferenceRow('hijriOffset', '1')
    backend.writePreferenceRow('theme', '{"mode":"dark"}')
    backend.writePreferenceRow('feedbackOutbox', '[]')

    const full = buildDiagnostics(app, reminders)
    const trimmed = buildFeedbackDiagnostics(app, reminders)

    expect(trimmed).toMatchObject({
      app,
      locale: full.locale,
      timeZone: full.timeZone,
      utcOffsetMinutes: full.utcOffsetMinutes,
      daylightSaving: full.daylightSaving,
      coordinates: null,
      reminders: { permission: 'granted', pending: 2 },
      data: {
        eventCounts: { 'prayer-performed': 2, 'item-completed': 1 },
        days: 2,
        preferenceKeys: ['hijriOffset', 'theme'],
      },
    })
    const json = JSON.stringify(trimmed)
    expect(json).not.toContain('fajr')
    expect(json).not.toContain('dark')
    expect(Object.keys(trimmed)).toHaveLength(12)
  })

  it('rounds coordinates to about a kilometre, not the share-sheet hundred metres', () => {
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
    expect(buildFeedbackDiagnostics(app, reminders).coordinates).toEqual({
      latitude: 51.51,
      longitude: -0.13,
    })
  })

  it('counts per-item overrides instead of naming them', () => {
    const full = buildDiagnostics(app, reminders)
    const trimmed = trimDiagnostics(
      { ...full, notifications: { ...full.notifications, perItem: { duha: true, witr: false } } },
      null,
    )
    expect(trimmed.notifications).not.toHaveProperty('perItem')
    expect(trimmed.notifications.perItemOverrides).toBe(2)
  })

  it('keeps the last twenty failures, without stacks, messages clipped', () => {
    for (let i = 0; i < 25; i++) appendFailure(`label${i}`, new Error(`m${i}`))
    const full: Diagnostics = buildDiagnostics(app, reminders)
    const long = { ...full, lastStorageError: 'e'.repeat(400) }
    const last = full.failures.at(-1)
    if (!last) throw new Error('no failures logged')
    long.failures = [...full.failures.slice(0, -1), { ...last, message: 'x'.repeat(400) }]

    const trimmed = trimDiagnostics(long, null)

    expect(trimmed.failures).toHaveLength(FEEDBACK_FAILURE_LIMIT)
    expect(trimmed.failures[0]?.label).toBe('label5')
    expect(trimmed.failures[0]).not.toHaveProperty('stack')
    expect(trimmed.failures.at(-1)?.message).toBe(`${'x'.repeat(300)}…`)
    expect(trimmed.lastStorageError).toBe(`${'e'.repeat(300)}…`)
    expect(trimDiagnostics({ ...full, lastStorageError: null }, null).lastStorageError).toBeNull()
  })
})
