import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { constants, fileSystem, sqlite, wrap } from '../../test/native'

const backend = await import('./backend')
const { MIGRATIONS } = await import('./migrations')

const EVENT = {
  kind: 'prayer-performed',
  subject: 'fajr',
  at: 1_000,
  logDay: '2026-09-22',
  windowStart: null,
  windowEnd: null,
  deltaSeconds: null,
}

describe('the native storage backend', () => {
  beforeEach(() => {
    backend.wipe()
  })

  it('round-trips a preference row and keeps a given stamp', () => {
    expect(backend.readPreferenceRow('locale')).toBeNull()

    backend.writePreferenceRow('locale', '"en"')
    backend.writePreferenceRowAt('place', 'null', 42)
    backend.writePreferenceRowAt('place', '{}', 43)

    expect(backend.readPreferenceRow('locale')).toEqual({ value: '"en"' })
    expect(backend.allPreferenceRows()).toContainEqual({ key: 'place', value: '{}' })
    expect(backend.preferenceRowsWithTime()).toContainEqual({
      key: 'place',
      value: '{}',
      updatedAt: 43,
    })
    expect(
      backend.preferenceRowsWithTime().find((r) => r.key === 'locale')?.updatedAt,
    ).toBeGreaterThan(0)
  })

  it('stores events once per identity and reads them oldest first by instant', () => {
    backend.insertEvents([
      { ...EVENT, subject: 'fajr', at: 2_000 },
      { ...EVENT, subject: 'dhuhr', at: 1_000, windowStart: 1, windowEnd: 3, deltaSeconds: 5 },
      { ...EVENT, subject: 'dhuhr', at: 1_000 },
    ])

    expect(backend.actionRows()).toEqual([
      {
        kind: 'prayer-performed',
        subject: 'dhuhr',
        at: 1_000,
        logDay: '2026-09-22',
        deltaSeconds: 5,
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

  it('reads toggle pairs for one day by instant', () => {
    backend.insertEvents([
      { ...EVENT, at: 3_000 },
      { ...EVENT, kind: 'prayer-unmarked', at: 2_000 },
      { ...EVENT, at: 9_000, logDay: '2026-09-23' },
    ])

    expect(backend.toggleRowsFor('prayer-performed', 'prayer-unmarked', '2026-09-22')).toEqual([
      { subject: 'fajr', kind: 'prayer-unmarked', at: 2_000 },
      { subject: 'fajr', kind: 'prayer-performed', at: 3_000 },
    ])
  })

  it('counts per subject and kind, and finds the first marked day', () => {
    expect(backend.firstMarkedLogDay()).toBeNull()

    backend.insertEvents([
      { ...EVENT, kind: 'prayer-missed', at: 1 },
      { ...EVENT, kind: 'prayer-missed', at: 2 },
      { ...EVENT, kind: 'prayer-made-up', at: 3 },
      { ...EVENT, at: 5_000, logDay: '2026-09-22' },
      { ...EVENT, at: 4_000, logDay: '2026-09-21' },
    ])

    expect(backend.countRows(['prayer-missed', 'prayer-made-up'])).toEqual([
      { subject: 'fajr', kind: 'prayer-made-up', total: 1 },
      { subject: 'fajr', kind: 'prayer-missed', total: 2 },
    ])
    expect(backend.firstMarkedLogDay()).toBe('2026-09-21')
  })

  it('reads fasting rows only', () => {
    backend.insertEvents([
      { ...EVENT, kind: 'fast-owed', at: 1, logDay: '2026-09-20' },
      { ...EVENT, at: 2 },
      { ...EVENT, kind: 'fast-made-up', at: 3, logDay: '2026-09-22' },
    ])

    expect(backend.fastRows()).toEqual([
      { kind: 'fast-owed', logDay: '2026-09-20' },
      { kind: 'fast-made-up', logDay: '2026-09-22' },
    ])
  })

  it('imports and syncs rows without a window, counting only the new ones', () => {
    const row = {
      kind: 'prayer-performed',
      subject: 'fajr',
      at: 1_000,
      logDay: 'd',
      deltaSeconds: 30,
    }

    expect(backend.insertExportedRows([row, { ...row, at: 2_000 }])).toBe(2)
    expect(backend.insertSyncedRows([row, { ...row, at: 3_000 }])).toBe(1)
    expect(backend.unsyncedEventRows().map((r) => r.at)).toEqual([1_000, 2_000])
  })

  it('tracks what has been pushed', () => {
    backend.insertEvents([
      { ...EVENT, at: 1_000 },
      { ...EVENT, at: 2_000 },
    ])
    const ids = backend.unsyncedEventRows().map((row) => row.id)

    backend.markEventsSynced(ids.slice(0, 1))
    expect(backend.unsyncedEventRows().map((row) => row.at)).toEqual([2_000])

    backend.resetEventsSynced()
    expect(backend.unsyncedEventRows()).toHaveLength(2)
  })

  it('wipes both tables', () => {
    backend.writePreferenceRow('locale', '"en"')
    backend.insertEvents([EVENT])

    backend.wipe()

    expect(backend.allPreferenceRows()).toEqual([])
    expect(backend.actionRows()).toEqual([])
  })

  it('opens the app-local database, with no error', () => {
    expect(sqlite.opens[0]).toEqual({ name: 'ihsaanly.db', directory: undefined })
    expect(backend.lastDatabaseError()).toBeNull()
  })

  it('only uses the shared container when it is switched on and the group exists', () => {
    fileSystem.Paths.appleSharedContainers['group.app.ihsaanly.companion'] = {
      uri: 'file:///shared',
    }
    constants.expoConfig.extra = { appGroup: 'group.test' }
    fileSystem.Paths.appleSharedContainers['group.test'] = { uri: 'file:///test' }

    expect(backend.databaseDirectoryFor(false, 'group.test')).toBeUndefined()
    expect(backend.databaseDirectoryFor(true, 'group.test')).toBe('file:///test')
    expect(backend.databaseDirectoryFor(true, 'group.none')).toBeUndefined()
  })
})

describe('opening the database', () => {
  afterAll(() => {
    // The error is module state shared with every other test file: leave it clear.
    backend.connect()
  })

  it('falls back to memory when the file cannot be opened, and says why', () => {
    sqlite.failOpen = new Error('disk is full')
    const connection = backend.connect() as unknown as { getFirstSync: (sql: string) => unknown }
    sqlite.failOpen = null

    expect(backend.lastDatabaseError()).toBe('open: disk is full')
    expect(sqlite.opens.at(-1)?.name).toBe(':memory:')
    expect(connection.getFirstSync('PRAGMA user_version')).toEqual({
      user_version: MIGRATIONS.length,
    })
  })

  it('reports a thrown non-error by its text', () => {
    sqlite.failOpen = 'locked' as unknown as Error
    backend.connect()
    sqlite.failOpen = null

    expect(backend.lastDatabaseError()).toBe('open: locked')
  })

  it('migrates a database it opens', () => {
    const version = wrap(sqlite.db).getFirstSync as (sql: string) => { user_version: number }
    expect(version('PRAGMA user_version').user_version).toBe(MIGRATIONS.length)
  })
})
