import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

/**
 * The web backend reads `globalThis.localStorage` once, at import time, so
 * the stub has to exist before the module does. Nothing else in this package
 * needs a DOM; this is the one file that does.
 */
function fakeLocalStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length(): number {
      return data.size
    },
  } as Storage
}

;(globalThis as unknown as { localStorage: Storage }).localStorage = fakeLocalStorage()

const backend = await import('./backend.web')

const EVENT = {
  kind: 'prayer-performed',
  subject: 'fajr',
  at: 1_000,
  logDay: '2026-09-22',
  windowStart: null,
  windowEnd: null,
  deltaSeconds: null,
}

describe('the web storage backend', () => {
  beforeEach(() => {
    backend.wipe()
  })

  it('round-trips a preference row', () => {
    expect(backend.readPreferenceRow('locale')).toBeNull()

    backend.writePreferenceRow('locale', '"en"')
    expect(backend.readPreferenceRow('locale')).toEqual({ value: '"en"' })
    expect(backend.allPreferenceRows()).toEqual([{ key: 'locale', value: '"en"' }])

    backend.writePreferenceRow('locale', '"ar"')
    expect(backend.allPreferenceRows()).toEqual([{ key: 'locale', value: '"ar"' }])
  })

  it('inserts events and reads them back oldest first by instant', () => {
    backend.insertEvents([
      { ...EVENT, subject: 'fajr', at: 2_000 },
      { ...EVENT, subject: 'dhuhr', at: 1_000 },
    ])

    expect(backend.actionRows()).toEqual([
      {
        kind: 'prayer-performed',
        subject: 'dhuhr',
        at: 1_000,
        logDay: '2026-09-22',
        deltaSeconds: null,
      },
      {
        kind: 'prayer-performed',
        subject: 'fajr',
        at: 2_000,
        logDay: '2026-09-22',
        deltaSeconds: null,
      },
    ])
  })

  it('skips an event whose kind, subject and instant are already stored', () => {
    backend.insertEvents([EVENT, EVENT])
    backend.insertEvents([EVENT])

    expect(backend.actionRows()).toHaveLength(1)
    expect(backend.insertExportedRows([EVENT, { ...EVENT, at: 2_000 }])).toBe(1)
    expect(backend.insertSyncedRows([EVENT, { ...EVENT, at: 2_000 }])).toBe(0)
  })

  it('folds a toggle merged from another device by instant, not arrival', () => {
    backend.insertEvents([{ ...EVENT, kind: 'prayer-performed', subject: 'fajr', at: 3_000 }])
    // Arrives later, happened earlier: the mark after it must still win.
    backend.insertSyncedRows([{ ...EVENT, kind: 'prayer-unmarked', subject: 'fajr', at: 2_000 }])

    expect(backend.toggleRowsFor('prayer-performed', 'prayer-unmarked', '2026-09-22')).toEqual([
      { subject: 'fajr', kind: 'prayer-unmarked', at: 2_000 },
      { subject: 'fajr', kind: 'prayer-performed', at: 3_000 },
    ])
  })

  it('tracks what has been pushed', () => {
    backend.insertEvents([{ ...EVENT, at: 1_000 }])
    backend.insertSyncedRows([{ ...EVENT, at: 2_000 }])

    const unsynced = backend.unsyncedEventRows()
    expect(unsynced.map((row) => row.at)).toEqual([1_000])

    backend.markEventsSynced(unsynced.map((row) => row.id))
    expect(backend.unsyncedEventRows()).toEqual([])

    backend.resetEventsSynced()
    expect(backend.unsyncedEventRows().map((row) => row.at)).toEqual([1_000, 2_000])
  })

  it('stamps local preference writes and keeps a given stamp', () => {
    const before = Date.now()
    backend.writePreferenceRow('locale', '"en"')
    backend.writePreferenceRowAt('place', 'null', 42)

    const rows = backend.preferenceRowsWithTime()
    expect(rows.find((row) => row.key === 'place')).toEqual({
      key: 'place',
      value: 'null',
      updatedAt: 42,
    })
    expect(rows.find((row) => row.key === 'locale')?.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('deletes preference rows with their stamps, leaving the rest', () => {
    backend.writePreferenceRowAt('progress:a', '{}', 1)
    backend.writePreferenceRowAt('progress:b', '{}', 2)
    backend.deletePreferenceRows(['progress:a', 'missing'])
    expect(backend.readPreferenceRow('progress:a')).toBeNull()
    expect(
      backend.preferenceRowsWithTime().filter((row) => row.key.startsWith('progress:')),
    ).toEqual([{ key: 'progress:b', value: '{}', updatedAt: 2 }])
  })

  it('folds a toggle pair to the latest state per subject', () => {
    backend.insertEvents([
      { ...EVENT, kind: 'prayer-performed', subject: 'fajr', at: 1_000 },
      { ...EVENT, kind: 'prayer-unmarked', subject: 'fajr', at: 2_000 },
      { ...EVENT, kind: 'prayer-performed', subject: 'dhuhr', at: 3_000 },
    ])

    expect(backend.toggleRowsFor('prayer-performed', 'prayer-unmarked', '2026-09-22')).toEqual([
      { subject: 'fajr', kind: 'prayer-performed', at: 1_000 },
      { subject: 'fajr', kind: 'prayer-unmarked', at: 2_000 },
      { subject: 'dhuhr', kind: 'prayer-performed', at: 3_000 },
    ])
  })

  it('counts events per subject and kind', () => {
    backend.insertEvents([
      { ...EVENT, kind: 'prayer-missed', subject: 'fajr', at: 1_000 },
      { ...EVENT, kind: 'prayer-missed', subject: 'fajr', at: 2_000 },
      { ...EVENT, kind: 'prayer-made-up', subject: 'fajr' },
      { ...EVENT, kind: 'prayer-missed', subject: 'dhuhr' },
    ])

    const rows = backend.countRows(['prayer-missed', 'prayer-made-up'])
    expect(rows).toContainEqual({ subject: 'fajr', kind: 'prayer-missed', total: 2 })
    expect(rows).toContainEqual({ subject: 'fajr', kind: 'prayer-made-up', total: 1 })
    expect(rows).toContainEqual({ subject: 'dhuhr', kind: 'prayer-missed', total: 1 })
  })

  it('finds the earliest marked day by time, not insertion order', () => {
    expect(backend.firstMarkedLogDay()).toBeNull()

    backend.insertEvents([
      { ...EVENT, kind: 'prayer-performed', at: 2_000, logDay: '2026-09-22' },
      { ...EVENT, kind: 'prayer-performed', at: 1_000, logDay: '2026-09-21' },
    ])

    expect(backend.firstMarkedLogDay()).toBe('2026-09-21')
  })

  it('reads fasting rows oldest first, ignoring other kinds', () => {
    backend.insertEvents([
      { ...EVENT, kind: 'fast-owed', subject: 'fast', logDay: '2026-09-20' },
      { ...EVENT, kind: 'prayer-performed', subject: 'fajr', logDay: '2026-09-21' },
      { ...EVENT, kind: 'fast-made-up', subject: 'fast', logDay: '2026-09-22' },
    ])

    expect(backend.fastRows()).toEqual([
      { kind: 'fast-owed', logDay: '2026-09-20' },
      { kind: 'fast-made-up', logDay: '2026-09-22' },
    ])
  })

  it('inserts exported rows with a null window and reports the count', () => {
    const count = backend.insertExportedRows([
      {
        kind: 'prayer-performed',
        subject: 'fajr',
        at: 1_000,
        logDay: '2026-09-22',
        deltaSeconds: 30,
      },
    ])

    expect(count).toBe(1)
    expect(backend.actionRows()).toEqual([
      {
        kind: 'prayer-performed',
        subject: 'fajr',
        at: 1_000,
        logDay: '2026-09-22',
        deltaSeconds: 30,
      },
    ])
  })

  it('wipes both tables', () => {
    backend.writePreferenceRow('locale', '"en"')
    backend.insertEvents([EVENT])

    backend.wipe()

    expect(backend.allPreferenceRows()).toEqual([])
    expect(backend.actionRows()).toEqual([])
  })
})

describe('loading a stored blob', () => {
  it('numbers the next event after the highest one stored', () => {
    expect(backend.nextIdAfter([])).toBe(1)
    expect(backend.nextIdAfter([{ id: 3 }, { id: 9 }, { id: 4 }])).toBe(10)
  })

  const real = globalThis.localStorage
  const withBlob = (blob: string | null): void => {
    ;(globalThis as unknown as { localStorage: Pick<Storage, 'getItem'> }).localStorage = {
      getItem: () => blob,
    }
  }

  afterEach(() => {
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = real
  })

  it('starts empty with nothing stored', () => {
    withBlob(null)
    expect(backend.load()).toEqual({ preferences: {}, events: [] })
  })

  it('starts empty when the stored value is not a store', () => {
    withBlob('{"something":"else"}')
    expect(backend.load()).toEqual({ preferences: {}, events: [] })
  })

  it('starts empty and remembers why when the blob is unreadable', () => {
    withBlob('{"oops')

    expect(backend.load()).toEqual({ preferences: {}, events: [] })
    expect(backend.lastDatabaseError()).toStartWith('open: ')
  })

  it('reads a blob written before sync: no flags, no stamps, a batch sharing one instant', () => {
    const legacy = {
      preferences: { locale: '"en"' },
      events: [1, 2, 3].map((id) => ({
        id,
        kind: 'prayer-made-up',
        subject: 'fajr',
        at: 1_000,
        logDay: '2026-09-22',
        windowStart: null,
        windowEnd: null,
        deltaSeconds: null,
      })),
    }
    withBlob(JSON.stringify(legacy))

    const loaded = backend.load()
    expect(loaded.preferenceTimes).toBeUndefined()
    expect(loaded.events.every((event) => event.synced === undefined)).toBe(true)
    expect(backend.withUniqueIdentities(loaded.events).map((event) => event.at)).toEqual([
      1_000, 1_001, 1_002,
    ])
  })

  it('drops a repeat that still collides after being nudged', () => {
    const event = {
      kind: 'k',
      subject: 's',
      logDay: 'd',
      windowStart: null,
      windowEnd: null,
      deltaSeconds: null,
    }
    const events = [
      { ...event, id: 1, at: 1_000 },
      { ...event, id: 2, at: 1_000 },
      { ...event, id: 3, at: 1_001 },
    ]

    expect(backend.withUniqueIdentities(events).map((entry) => entry.id)).toEqual([1, 2])
  })
})

describe('a browser that will not store', () => {
  const real = globalThis.localStorage

  afterEach(() => {
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = real
  })

  it('keeps working in memory and records why the write failed', () => {
    ;(
      globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }
    ).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }

    backend.writePreferenceRow('locale', '"en"')

    expect(backend.readPreferenceRow('locale')).toEqual({ value: '"en"' })
    expect(backend.lastDatabaseError()).toBe('write: quota exceeded')
  })

  it('records a write failure that is not an Error by its text', () => {
    ;(
      globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }
    ).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw 'full'
      },
    }

    backend.wipe()

    expect(backend.lastDatabaseError()).toBe('write: full')
  })

  describe('the content cache rows', () => {
    const set = (storage: unknown): void => {
      ;(globalThis as unknown as { localStorage: unknown }).localStorage = storage
    }

    it('keep each row under its own key, outside the data blob, and out of a wipe', () => {
      set(fakeLocalStorage())
      expect(backend.readContentRow('bundle')).toBeNull()
      expect(backend.writeContentRow('bundle', '{"version":"a"}')).toBe(true)
      expect(globalThis.localStorage.getItem('ihsaanly.content.v1.bundle')).toBe('{"version":"a"}')
      expect(backend.readContentRow('bundle')).toBe('{"version":"a"}')

      backend.wipe()
      expect(backend.allPreferenceRows()).toEqual([])
      expect(globalThis.localStorage.getItem('ihsaanly.db.v1')).not.toContain('version')
      expect(backend.readContentRow('bundle')).toBe('{"version":"a"}')

      backend.removeContentRow('bundle')
      expect(backend.readContentRow('bundle')).toBeNull()
    })

    it('report a failed write and leave the old row whole', () => {
      set({
        getItem: () => 'old',
        setItem: () => {
          throw new Error('quota exceeded')
        },
        removeItem: () => {
          throw new Error('denied')
        },
      })
      expect(backend.writeContentRow('bundle', 'new')).toBe(false)
      expect(backend.readContentRow('bundle')).toBe('old')
      expect(() => backend.removeContentRow('bundle')).not.toThrow()
    })

    it('answer nothing where storage is unreachable', () => {
      set(undefined)
      expect(backend.readContentRow('bundle')).toBeNull()
      expect(backend.writeContentRow('bundle', 'x')).toBe(false)
      backend.removeContentRow('bundle')

      set({
        getItem: () => {
          throw new Error('denied')
        },
      })
      expect(backend.readContentRow('bundle')).toBeNull()
      set(fakeLocalStorage())
    })
  })
})
