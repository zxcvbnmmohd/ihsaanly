import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { sqlite } from '../../test/native'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { DEFAULT_CALCULATION_PREFERENCES } = await import('@ihsaanly/core/prayer/calculation')
const backend = await import('../storage/backend')
const events = await import('../storage/events')
const { setBacklog } = await import('./backlog-store')
const marks = await import('./marks')

const place = {
  label: 'London',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const
const at = new Date('2026-09-22T05:00:00Z')

describe('marking prayers', () => {
  beforeEach(resetStorage)

  it('records a prayer on the local day, with the window for the timing metric', () => {
    marks.markPrayer('fajr', at, 'Europe/London', {
      startsAt: new Date('2026-09-22T04:00:00Z'),
      endsAt: new Date('2026-09-22T06:00:00Z'),
    })

    expect(events.allActions()).toEqual([
      {
        kind: 'prayer-performed',
        subject: 'fajr',
        at: at.getTime(),
        logDay: '2026-09-22',
        deltaSeconds: 0,
      },
    ])
  })

  it("takes a mark back with a later fact, and shows it in today's marks", () => {
    const { result } = renderHook(() => marks.useTodayMarks('Europe/London', at))

    act(() => marks.markPrayer('fajr', at, 'Europe/London'))
    expect(result.current).toEqual({ fajr: at })

    act(() => marks.unmarkPrayer('fajr', new Date(at.getTime() + 1_000), 'Europe/London'))
    expect(result.current).toEqual({})
    expect(events.allActions().map((action) => action.kind)).toEqual([
      'prayer-performed',
      'prayer-unmarked',
    ])
  })

  it('makes up prayers one at a time or in a batch a millisecond apart', () => {
    marks.markMadeUp('asr', at, 'Europe/London')
    marks.markMadeUpMany('fajr', 3, at, 'Europe/London')

    const fajr = events.allActions().filter((action) => action.subject === 'fajr')
    expect(fajr.map((action) => action.at)).toEqual([
      at.getTime(),
      at.getTime() + 1,
      at.getTime() + 2,
    ])
    expect(events.allActions().filter((action) => action.kind === 'prayer-made-up')).toHaveLength(4)
  })

  it('counts what is owed: missed, less made up, plus the backlog from before tracking', () => {
    const { result } = renderHook(() => marks.useQada())
    expect(result.current).toEqual({})

    act(() => {
      setBacklog('fajr', 2)
      events.recordEvents([
        { kind: 'prayer-missed', subject: 'fajr', at: new Date(1), logDay: 'd' },
        { kind: 'prayer-missed', subject: 'dhuhr', at: new Date(2), logDay: 'd' },
        { kind: 'prayer-made-up', subject: 'dhuhr', at: new Date(3), logDay: 'd' },
      ])
    })

    expect(result.current.fajr).toBe(3)
    expect(result.current.dhuhr ?? 0).toBe(0)
  })
})

describe('the daily rollover', () => {
  const now = new Date('2026-09-21T12:00:00Z')
  const run = (paused = false): void =>
    marks.runRollover(place, DEFAULT_CALCULATION_PREFERENCES, now, paused)
  const cursor = (): unknown =>
    JSON.parse(backend.readPreferenceRow('qadaProcessedThrough')?.value ?? 'null')
  const missed = (): { subject: string; logDay: string }[] =>
    events
      .allActions()
      .filter((action) => action.kind === 'prayer-missed')
      .map((action) => ({ subject: action.subject, logDay: action.logDay }))

  beforeEach(resetStorage)

  it('only plants the cursor on the very first run, accruing nothing', () => {
    run()

    expect(cursor()).toBe('2026-09-20')
    expect(missed()).toEqual([])
  })

  it('does nothing when the cursor is already up to date', () => {
    backend.writePreferenceRow('qadaProcessedThrough', '"2026-09-20"')
    run()
    expect(missed()).toEqual([])
    expect(cursor()).toBe('2026-09-20')
  })

  it('accrues the five prayers of each passed day from the first mark on, and advances the cursor', () => {
    backend.writePreferenceRow('qadaProcessedThrough', '"2026-09-18"')
    events.recordEvent({
      kind: 'prayer-performed',
      subject: 'fajr',
      at: new Date('2026-09-18T05:00:00Z'),
      logDay: '2026-09-18',
    })
    events.recordEvent({
      kind: 'prayer-performed',
      subject: 'fajr',
      at: new Date('2026-09-19T05:00:00Z'),
      logDay: '2026-09-19',
    })

    run()

    const byDay = (day: string): string[] =>
      missed()
        .filter((entry) => entry.logDay === day)
        .map((entry) => entry.subject)
    expect(byDay('2026-09-19')).toHaveLength(4)
    expect(byDay('2026-09-19')).not.toContain('fajr')
    expect(byDay('2026-09-20')).toHaveLength(5)
    expect(cursor()).toBe('2026-09-20')

    run()
    expect(missed()).toHaveLength(9)
  })

  it('accrues nothing for days before the first mark ever recorded', () => {
    backend.writePreferenceRow('qadaProcessedThrough', '"2026-09-15"')
    events.recordEvent({
      kind: 'prayer-performed',
      subject: 'fajr',
      at: new Date('2026-09-20T05:00:00Z'),
      logDay: '2026-09-20',
    })

    run()

    expect(missed().every((entry) => entry.logDay >= '2026-09-20')).toBe(true)
    expect(cursor()).toBe('2026-09-20')
  })

  it('accrues nothing while tracking is paused, yet still moves on so resuming never backfills', () => {
    backend.writePreferenceRow('qadaProcessedThrough', '"2026-09-18"')
    events.recordEvent({
      kind: 'prayer-performed',
      subject: 'fajr',
      at: new Date('2026-09-17T05:00:00Z'),
      logDay: '2026-09-17',
    })

    run(true)
    expect(missed()).toEqual([])
    expect(cursor()).toBe('2026-09-20')

    run(false)
    expect(missed()).toEqual([])
  })

  it('never stops the app: a failure is noted for the diagnostic bundle', () => {
    sqlite.db.exec('ALTER TABLE preferences RENAME TO preferences_hidden')
    try {
      expect(() => run()).not.toThrow()
    } finally {
      sqlite.db.exec('ALTER TABLE preferences_hidden RENAME TO preferences')
    }

    expect(events.lastStorageError()).toStartWith('rollover:')
  })
})
