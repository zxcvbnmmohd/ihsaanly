import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { sqlite } from '../../test/native'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const events = await import('./events')
type NewEvent = import('./events').NewEvent
const { onLocalWrite } = await import('./local-writes')
const { recentFailures } = await import('./log')

const DAY = '2026-09-22'

const prayed = (
  prayer: string,
  at: number,
  kind: 'prayer-performed' | 'prayer-unmarked' = 'prayer-performed',
): NewEvent => ({ kind, subject: prayer, at: new Date(at), logDay: DAY })

/** Runs `work` with a table out of the way, so the real SQL fails the way a corrupt database would. */
function withTableMissing<T>(table: string, work: () => T): T {
  sqlite.db.exec(`ALTER TABLE ${table} RENAME TO ${table}_hidden`)
  try {
    return work()
  } finally {
    sqlite.db.exec(`ALTER TABLE ${table}_hidden RENAME TO ${table}`)
  }
}

describe('recording events', () => {
  beforeEach(resetStorage)

  it('records a fact, tells sync, and stores the signed offset from the window middle', () => {
    const writes: (string | null)[] = []
    const stop = onLocalWrite((key) => writes.push(key))

    events.recordEvent({
      kind: 'prayer-performed',
      subject: 'fajr',
      at: new Date(1_000_000),
      logDay: DAY,
      windowStart: new Date(0),
      windowEnd: new Date(1_800_000),
    })
    stop()

    expect(events.allActions()).toEqual([
      { kind: 'prayer-performed', subject: 'fajr', at: 1_000_000, logDay: DAY, deltaSeconds: 100 },
    ])
    expect(writes).toEqual([null])
  })

  it('records no offset when the window is missing or half there', () => {
    events.recordEvents([{ ...prayed('fajr', 1), windowStart: new Date(0) }, prayed('dhuhr', 2)])

    expect(events.allActions().map((action) => action.deltaSeconds)).toEqual([null, null])
  })

  it('writes a batch in one go and announces it once', () => {
    const { result } = renderHook(() => events.useEventVersion())
    const before = result.current

    act(() => events.recordEvents([prayed('fajr', 1), prayed('dhuhr', 2)]))

    expect(result.current).toBe(before + 1)
    expect(events.allActions()).toHaveLength(2)
  })

  it('keeps the app running and notes the failure when a write fails', () => {
    withTableMissing('events', () => {
      expect(() => events.recordEvent(prayed('fajr', 1))).not.toThrow()
      expect(() => events.recordEvents([prayed('fajr', 1)])).not.toThrow()
    })

    expect(events.lastStorageError()).toContain('recordEvents:')
    expect(recentFailures().at(-1)?.label).toBe('recordEvents')
  })

  it('notes a failure that was not an Error by its text', () => {
    events.noteFailure('custom', 'plain')
    expect(events.lastStorageError()).toBe('custom: plain')
  })
})

describe('reading what was recorded', () => {
  beforeEach(resetStorage)

  it('folds marks per prayer, the latest of mark and unmark winning', () => {
    events.recordEvents([
      prayed('fajr', 1_000),
      prayed('fajr', 2_000, 'prayer-unmarked'),
      prayed('dhuhr', 3_000),
      prayed('asr', 4_000),
      prayed('asr', 5_000, 'prayer-unmarked'),
      prayed('asr', 6_000),
    ])

    expect(events.prayerMarksOn(DAY)).toEqual({ dhuhr: new Date(3_000), asr: new Date(6_000) })
    expect(events.markedPrayersOn(DAY)).toEqual(['dhuhr', 'asr'])
    expect(events.prayerMarksOn('2026-01-01')).toEqual({})
  })

  it('serves the same snapshot until something is recorded', () => {
    events.recordEvent(prayed('fajr', 1_000))
    const first = events.prayerMarksOn(DAY)

    expect(events.prayerMarksOn(DAY)).toBe(first)
    events.recordEvent(prayed('dhuhr', 2_000))
    expect(events.prayerMarksOn(DAY)).not.toBe(first)
  })

  it('reads as empty when the query fails', () => {
    events.reloadEvents()
    withTableMissing('events', () => {
      expect(events.prayerMarksOn(DAY)).toEqual({})
      expect(events.allActions()).toEqual([])
      expect(events.firstMarkedDay()).toBeNull()
    })
    expect(events.lastStorageError()).not.toBeNull()
  })

  it('finds the first marked day', () => {
    expect(events.firstMarkedDay()).toBeNull()
    events.recordEvent(prayed('fajr', 1_000))
    expect(events.firstMarkedDay()).toBe(DAY)
  })

  it('imports exported facts and refuses to import into a broken store', () => {
    const exported = {
      kind: 'prayer-performed',
      subject: 'fajr',
      at: 5,
      logDay: DAY,
      deltaSeconds: null,
    }
    const writes: (string | null)[] = []
    const stop = onLocalWrite((key) => writes.push(key))

    expect(events.insertExportedEvents([exported, exported])).toBe(1)
    stop()
    expect(writes).toEqual([null])

    withTableMissing('events', () => {
      expect(events.insertExportedEvents([{ ...exported, at: 6 }])).toBe(0)
    })
  })

  it('announces synced facts only when something was new, and never as a local write', () => {
    const writes: (string | null)[] = []
    const stop = onLocalWrite((key) => writes.push(key))
    const { result } = renderHook(() => events.useEventVersion())
    const before = result.current
    const synced = {
      kind: 'prayer-performed',
      subject: 'fajr',
      at: 5,
      logDay: DAY,
      deltaSeconds: null,
    }

    act(() => void events.insertSyncedEvents([synced]))
    const afterFirst = result.current
    act(() => void events.insertSyncedEvents([synced]))
    stop()

    expect(afterFirst).toBe(before + 1)
    expect(result.current).toBe(afterFirst)
    expect(writes).toEqual([])
  })

  it('exposes every stored preference decoded', () => {
    sqlite.db.exec(`INSERT INTO preferences (key, value) VALUES ('a', '{"x":1}')`)
    expect(events.allPreferences()).toEqual({ a: { x: 1 } })

    withTableMissing('preferences', () => expect(events.allPreferences()).toEqual({}))
  })
})

describe('the hooks', () => {
  beforeEach(resetStorage)

  it('useMarksOn re-renders with a new mark', () => {
    const { result } = renderHook(() => events.useMarksOn(DAY))
    expect(result.current).toEqual({})

    act(() => events.recordEvent(prayed('fajr', 1_000)))

    expect(result.current).toEqual({ fajr: new Date(1_000) })
  })

  it('useCompletedOn follows completions and un-completions', () => {
    const { result } = renderHook(() => events.useCompletedOn(DAY))

    act(() =>
      events.recordEvent({ kind: 'item-completed', subject: 'witr', at: new Date(1), logDay: DAY }),
    )
    expect(result.current).toEqual({ witr: new Date(1) })

    act(() =>
      events.recordEvent({
        kind: 'item-uncompleted',
        subject: 'witr',
        at: new Date(2),
        logDay: DAY,
      }),
    )
    expect(result.current).toEqual({})
  })

  it('useQadaCounts nets misses against make-ups', () => {
    const { result } = renderHook(() => events.useQadaCounts())
    expect(result.current).toEqual({})

    act(() =>
      events.recordEvents([
        { kind: 'prayer-missed', subject: 'fajr', at: new Date(1), logDay: DAY },
        { kind: 'prayer-missed', subject: 'fajr', at: new Date(2), logDay: DAY },
        { kind: 'prayer-made-up', subject: 'fajr', at: new Date(3), logDay: DAY },
        { kind: 'prayer-made-up', subject: 'asr', at: new Date(4), logDay: DAY },
      ]),
    )

    expect(result.current).toEqual({ fajr: 1, asr: -1 })
  })

  it('useFastLedger folds fasting events, and is empty when they cannot be read', () => {
    const { result } = renderHook(() => events.useFastLedger())
    expect(result.current.owedDays).toEqual([])

    act(() =>
      events.recordEvent({ kind: 'fast-owed', subject: 'fast', at: new Date(1), logDay: DAY }),
    )
    expect(result.current.owedDays).toEqual([DAY])

    withTableMissing('events', () => act(() => events.reloadEvents()))
    expect(result.current.owedDays).toEqual([])
  })

  it('useActions lists every event, oldest first', () => {
    const { result } = renderHook(() => events.useActions())
    expect(result.current).toEqual([])

    act(() => events.recordEvents([prayed('dhuhr', 2), prayed('fajr', 1)]))

    expect(result.current.map((action) => action.subject)).toEqual(['fajr', 'dhuhr'])
  })

  it('stops listening when the component goes away', () => {
    const { result, unmount } = renderHook(() => events.useEventVersion())
    unmount()
    const before = result.current

    events.recordEvent(prayed('fajr', 1))

    expect(result.current).toBe(before)
  })
})
