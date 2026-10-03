import { beforeEach, describe, expect, test } from 'bun:test'
import { Timestamp } from 'firebase/firestore'
import { fake, resetFakes, snapshot } from '../../test/firebase-fakes'
import type { RemoteChanges, SyncEvent, SyncPreference } from '../ports'

const { createFirestoreSyncRemote, eventKey } = await import('./sync-remote')

const db = { kind: 'db' } as never
const event = (overrides: Partial<SyncEvent> = {}): SyncEvent => ({
  kind: 'prayer',
  subject: 'fajr',
  at: 1_760_000_000_000,
  logDay: '2025-10-09',
  deltaSeconds: null,
  ...overrides,
})
const pref = (key: string, value: string, updatedAt = 1): SyncPreference => ({
  key,
  value,
  updatedAt,
})
const stored = (path: string): Record<string, unknown> | undefined => fake.docs.get(path)

let remote: ReturnType<typeof createFirestoreSyncRemote>
beforeEach(() => {
  resetFakes()
  remote = createFirestoreSyncRemote(db)
})

describe('push', () => {
  test('writes one sync document per month and the preferences, with readable fields', async () => {
    await remote.push('u1', {
      events: [
        event(),
        event({ subject: 'dhuhr', deltaSeconds: 90 }),
        event({ at: 5, logDay: '2025-11-02' }),
      ],
      preferences: [pref('theme', '"dark"', 7)],
    })

    const october = stored('users/u1/sync/2025-10')
    expect(october).toMatchObject({ type: 'events', month: '2025-10' })
    expect(Object.keys(october ?? {}).sort()).toEqual(['events', 'month', 'type', 'updatedAt'])
    expect(Object.keys(october?.events as object)).toEqual([
      eventKey(event()),
      eventKey(event({ subject: 'dhuhr' })),
    ])
    const entries = october?.events as Record<string, unknown>
    expect(entries[eventKey(event({ subject: 'dhuhr' }))]).toEqual({
      logDay: '2025-10-09',
      deltaSeconds: 90,
    })
    expect(october?.updatedAt).toBeInstanceOf(Timestamp)
    expect(stored('users/u1/sync/2025-11')).toMatchObject({ type: 'events', month: '2025-11' })
    expect(stored('users/u1/sync/preferences')).toMatchObject({
      type: 'preferences',
      preferences: { theme: { value: '"dark"', updatedAt: 7 } },
    })
    expect(stored('users/u1/sync/preferences')?.updatedAt).toBeInstanceOf(Timestamp)
    // No profile unless asked for, and nothing is read to decide.
    expect(stored('users/u1')).toBeUndefined()
    expect(fake.reads).toEqual([])
    expect(fake.queries).toEqual([])
    expect(fake.batches).toEqual([3])
  })

  test('writes the profile only when asked, replacing a layout-1 one', async () => {
    fake.docs.set('users/u1', { schema: 1, createdAt: 'earlier' })
    await remote.push('u1', { events: [], preferences: [], profile: true })
    expect(Object.keys(stored('users/u1') ?? {}).sort()).toEqual(['createdAt', 'schemaVersion'])
    expect(stored('users/u1')).toMatchObject({ schemaVersion: 2 })
    expect(stored('users/u1')?.createdAt).toBeInstanceOf(Timestamp)
    expect(fake.batches).toEqual([1])

    await remote.push('u1', { events: [event()], preferences: [], profile: false })
    expect(fake.batches).toEqual([1, 1])
  })

  test('merges into a month instead of replacing it, and keeps other preferences', async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('a', '1'), pref('b', '2')] })
    await remote.push('u1', {
      events: [event({ subject: 'asr' })],
      preferences: [pref('a', '3', 9)],
    })
    expect(Object.keys(stored('users/u1/sync/2025-10')?.events as object)).toHaveLength(2)
    expect(stored('users/u1/sync/preferences')?.preferences).toEqual({
      a: { value: '3', updatedAt: 9 },
      b: { value: '2', updatedAt: 1 },
    })
  })

  test('deletes removed preference keys in the same merge, keeping the rest', async () => {
    await remote.push('u1', {
      events: [],
      preferences: [pref('a', '1'), pref('progress:x', '{}'), pref('progress:y', '{}')],
    })
    await remote.push('u1', {
      events: [],
      preferences: [pref('a', '2', 3)],
      removedPreferences: ['progress:x'],
    })
    expect(stored('users/u1/sync/preferences')?.preferences).toEqual({
      a: { value: '2', updatedAt: 3 },
      'progress:y': { value: '{}', updatedAt: 1 },
    })
    // A removal alone still writes (and stamps) the document.
    await remote.push('u1', { events: [], preferences: [], removedPreferences: ['progress:y'] })
    expect(stored('users/u1/sync/preferences')?.preferences).toEqual({
      a: { value: '2', updatedAt: 3 },
    })
    expect(fake.batches).toEqual([1, 1, 1])
  })

  test('writes no preferences document when there are none, and nothing at all for an empty push', async () => {
    await remote.push('u1', { events: [], preferences: [] })
    expect(stored('users/u1/sync/preferences')).toBeUndefined()
    expect(fake.batches).toEqual([])
  })

  test('splits a large push into batches of at most 450 writes', async () => {
    // One month document each: years 1..1000, plus the profile.
    const events = Array.from({ length: 1000 }, (_, i) =>
      event({ at: i + 1, logDay: `${String(i + 1).padStart(4, '0')}-01-01` }),
    )
    await remote.push('u1', { events, preferences: [], profile: true })
    expect(fake.batches).toEqual([450, 450, 101])
    expect([...fake.docs.keys()].filter((path) => path.includes('/sync/'))).toHaveLength(1000)
  })
})

describe('pull', () => {
  test('an empty account has nothing and keeps a null cursor', async () => {
    expect(await remote.pull('u1', null)).toEqual({ events: [], preferences: [], cursor: null })
  })

  test('reads every month and the preferences in one query, and returns the newest updatedAt as cursor', async () => {
    await remote.push('u1', {
      events: [event({ logDay: '2025-10-09' }), event({ at: 2, logDay: '2025-11-02' })],
      preferences: [pref('theme', '"dark"', 7)],
    })
    const pulled = await remote.pull('u1', null)
    expect(pulled.events).toHaveLength(2)
    expect(pulled.preferences).toEqual([pref('theme', '"dark"', 7)])
    expect(pulled.cursor).toBe('1.0')
    expect(fake.queries).toEqual(['users/u1/sync'])
    expect(fake.reads).toEqual([])
  })

  test('only documents written after the cursor come back, preferences included, and the cursor advances', async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('theme', '"dark"', 7)] })
    const first = await remote.pull('u1', null)
    await remote.push('u1', { events: [event({ at: 2, logDay: '2025-12-01' })], preferences: [] })

    const second = await remote.pull('u1', first.cursor)
    expect(second.events.map((e) => e.logDay)).toEqual(['2025-12-01'])
    // Unchanged preferences are not read again.
    expect(second.preferences).toEqual([])
    expect(second.cursor).not.toBe(first.cursor)

    await remote.push('u1', { events: [], preferences: [pref('theme', '"light"', 9)] })
    const third = await remote.pull('u1', second.cursor)
    expect(third).toMatchObject({ events: [], preferences: [pref('theme', '"light"', 9)] })
  })

  test('with nothing new the cursor is unchanged', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    const { cursor } = await remote.pull('u1', null)
    expect(await remote.pull('u1', cursor)).toEqual({ events: [], preferences: [], cursor })
  })

  test('a cursor it cannot read means a full pull, and an unreadable one is passed back if empty', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    expect((await remote.pull('u1', 'garbage')).events).toHaveLength(1)
    expect((await remote.pull('empty', 'garbage')).cursor).toBe('garbage')
  })

  test('a document without a server time does not move the cursor, and an unknown type is skipped', async () => {
    fake.docs.set('users/u1/sync/2025-10', {
      type: 'events',
      month: '2025-10',
      events: { [eventKey(event())]: { logDay: '2025-10-09', deltaSeconds: null } },
    })
    fake.docs.set('users/u1/sync/other', { type: 'mystery', updatedAt: new Timestamp(5, 0) })
    const pulled = await remote.pull('u1', null)
    expect(pulled.events).toHaveLength(1)
    expect(pulled.preferences).toEqual([])
    expect(pulled.cursor).toBe('5.0')
  })

  test('layout-1 documents are not read', async () => {
    fake.docs.set('users/u1/eventMonths/2025-10', {
      events: { [eventKey(event())]: { l: '2025-10-09', d: null } },
      updatedAt: new Timestamp(5, 0),
    })
    fake.docs.set('users/u1/state/preferences', {
      prefs: { a: { v: '1', t: 1 } },
      updatedAt: new Timestamp(5, 0),
    })
    expect(await remote.pull('u1', null)).toEqual({ events: [], preferences: [], cursor: null })
  })

  test("does not read another user's data", async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('a', '1')] })
    expect(await remote.pull('u2', null)).toEqual({ events: [], preferences: [], cursor: null })
  })
})

describe('erase', () => {
  test('deletes every sync document, any layout-1 data and the profile, only for that user; keeps feedback and its limit', async () => {
    await remote.push('u1', {
      events: [event(), event({ at: 2, logDay: '2025-11-02' })],
      preferences: [pref('a', '1')],
      profile: true,
    })
    await remote.push('u2', { events: [event()], preferences: [], profile: true })
    fake.docs.set('users/u1/eventMonths/2025-09', { events: {} })
    fake.docs.set('users/u1/state/preferences', { prefs: {} })

    fake.docs.set('feedbackLimits/u1', { lastSentAt: 1 })
    fake.docs.set('feedbackLimits/u2', { lastSentAt: 1 })
    fake.docs.set('feedback/f1', { uid: 'u1' })

    await remote.erase('u1')
    expect([...fake.docs.keys()].filter((path) => path.startsWith('users/u1'))).toEqual([])
    expect(fake.docs.has('feedbackLimits/u1')).toBe(true)
    expect(fake.docs.has('feedbackLimits/u2')).toBe(true)
    // Feedback outlives the account, as the privacy policy says.
    expect(fake.docs.has('feedback/f1')).toBe(true)
    expect([...fake.docs.keys()].some((path) => path.startsWith('users/u2'))).toBe(true)
  })

  test('chunks the deletes too', async () => {
    for (let i = 1; i <= 250; i++) {
      fake.docs.set(`users/u1/sync/${String(i).padStart(4, '0')}-01`, { events: {} })
      fake.docs.set(`users/u1/eventMonths/${String(i).padStart(4, '0')}-01`, { events: {} })
    }
    await remote.erase('u1')
    expect(fake.batches).toEqual([450, 52])
    expect(fake.docs.size).toBe(0)
  })
})

describe('watch', () => {
  const watching = (
    cursor: string | null,
  ): { heard: RemoteChanges[]; errors: unknown[]; stop: () => void } => {
    const heard: RemoteChanges[] = []
    const errors: unknown[] = []
    const stop = remote.watch?.(
      'u1',
      cursor,
      (changes) => heard.push(changes),
      (error) => errors.push(error),
    )
    if (!stop) throw new Error('no watch')
    return { heard, errors, stop }
  }

  test('listens on the same query as pull: after the cursor, ordered by updatedAt', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    const { cursor } = await remote.pull('u1', null)
    watching(cursor)
    expect(fake.listeners[0]?.query).toMatchObject({
      col: { path: 'users/u1/sync' },
      constraints: [
        { type: 'where', field: 'updatedAt', op: '>' },
        { type: 'orderBy', field: 'updatedAt' },
      ],
    })
    watching(null)
    expect(fake.listeners[1]?.query.constraints).toEqual([{ type: 'orderBy', field: 'updatedAt' }])
  })

  test('maps each snapshot to changes and advances the cursor; an empty first snapshot says nothing', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    const { cursor } = await remote.pull('u1', null)
    const { heard } = watching(cursor)
    expect(heard).toEqual([])

    await remote.push('u1', {
      events: [event({ at: 2, logDay: '2025-12-01' })],
      preferences: [pref('theme', '"dark"', 7)],
    })
    expect(heard).toEqual([
      {
        events: [event({ at: 2, logDay: '2025-12-01' })],
        preferences: [pref('theme', '"dark"', 7)],
        cursor: '2.0',
      },
    ])

    // A month changed again: only that document, the preferences are not re-read.
    await remote.push('u1', { events: [event({ at: 3, logDay: '2025-12-01' })], preferences: [] })
    expect(heard[1]?.preferences).toEqual([])
    expect(heard[1]?.events).toHaveLength(2)
    expect(heard[1]?.cursor).toBe('3.0')
    // No query was made for any of it.
    expect(fake.queries).toEqual(['users/u1/sync'])
  })

  test('from no cursor, the first snapshot is everything', async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('a', '1')] })
    const { heard } = watching(null)
    expect(heard).toEqual([{ events: [event()], preferences: [pref('a', '1')], cursor: '1.0' }])
  })

  test("skips removed documents and this device's unconfirmed writes", async () => {
    const { heard } = watching(null)
    const listener = fake.listeners[0]
    const data = { type: 'preferences', preferences: { a: { value: '1', updatedAt: 1 } } }
    listener?.next({
      docChanges: () => [
        { type: 'removed', doc: snapshot('users/u1/sync/2025-10', { type: 'events' }) },
        { type: 'added', doc: snapshot('users/u1/sync/preferences', data, true) },
      ],
    })
    expect(heard).toEqual([])

    // Confirmed but without a server time (cannot happen under the rules): the cursor holds.
    listener?.next({
      docChanges: () => [{ type: 'added', doc: snapshot('users/u1/sync/preferences', data) }],
    })
    expect(heard).toEqual([{ events: [], preferences: [pref('a', '1')], cursor: null }])
  })

  test('reports a listener failure, and stops hearing once unsubscribed', async () => {
    const { heard, errors, stop } = watching(null)
    const failure = new Error('permission-denied')
    fake.listeners[0]?.error?.(failure)
    expect(errors).toEqual([failure])

    stop()
    await remote.push('u1', { events: [event()], preferences: [] })
    expect(heard).toEqual([])
  })

  test('a failure without an error callback is ignored', () => {
    remote.watch?.('u1', null, () => {})
    expect(() => fake.listeners[0]?.error?.(new Error('x'))).not.toThrow()
  })
})
