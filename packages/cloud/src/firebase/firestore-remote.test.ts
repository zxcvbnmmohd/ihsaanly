import { beforeEach, describe, expect, test } from 'bun:test'
import { Timestamp } from 'firebase/firestore'
import { fake, resetFakes } from '../../test/firebase-fakes'
import type { SyncEvent, SyncPreference } from '../ports'

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
  test('creates the user document, one document per month and the preferences', async () => {
    await remote.push('u1', {
      events: [
        event(),
        event({ subject: 'dhuhr', deltaSeconds: 90 }),
        event({ at: 5, logDay: '2025-11-02' }),
      ],
      preferences: [pref('theme', '"dark"', 7)],
    })

    expect(stored('users/u1')).toMatchObject({ schema: 1 })
    expect(stored('users/u1')?.createdAt).toBeInstanceOf(Timestamp)
    expect(Object.keys(stored('users/u1/eventMonths/2025-10')?.events as object)).toEqual([
      eventKey(event()),
      eventKey(event({ subject: 'dhuhr' })),
    ])
    const october = stored('users/u1/eventMonths/2025-10')?.events as Record<string, unknown>
    expect(october[eventKey(event({ subject: 'dhuhr' }))]).toEqual({ l: '2025-10-09', d: 90 })
    expect(stored('users/u1/eventMonths/2025-11')).toBeDefined()
    expect(stored('users/u1/eventMonths/2025-10')?.updatedAt).toBeInstanceOf(Timestamp)
    expect(stored('users/u1/state/preferences')?.prefs).toEqual({ theme: { v: '"dark"', t: 7 } })
    expect(fake.batches).toEqual([4])
  })

  test('only checks for the user document once per session', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    await remote.push('u1', { events: [event({ at: 2 })], preferences: [] })
    expect(fake.reads).toEqual(['users/u1'])
    expect(fake.batches).toEqual([2, 1])
  })

  test('leaves an existing user document alone', async () => {
    fake.docs.set('users/u1', { schema: 1, createdAt: 'earlier' })
    await remote.push('u1', { events: [event()], preferences: [] })
    expect(stored('users/u1')?.createdAt).toBe('earlier')
    expect(fake.batches).toEqual([1])
  })

  test('merges into a month instead of replacing it, and keeps other preferences', async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('a', '1'), pref('b', '2')] })
    await remote.push('u1', {
      events: [event({ subject: 'asr' })],
      preferences: [pref('a', '3', 9)],
    })
    expect(Object.keys(stored('users/u1/eventMonths/2025-10')?.events as object)).toHaveLength(2)
    expect(stored('users/u1/state/preferences')?.prefs).toEqual({
      a: { v: '3', t: 9 },
      b: { v: '2', t: 1 },
    })
  })

  test('writes no preferences document when there are none', async () => {
    await remote.push('u1', { events: [], preferences: [] })
    expect(stored('users/u1/state/preferences')).toBeUndefined()
    expect(fake.batches).toEqual([1])
  })

  test('splits a large push into batches of at most 450 writes', async () => {
    // One month document each: years 1..1000, plus the user document.
    const events = Array.from({ length: 1000 }, (_, i) =>
      event({ at: i + 1, logDay: `${String(i + 1).padStart(4, '0')}-01-01` }),
    )
    await remote.push('u1', { events, preferences: [] })
    expect(fake.batches).toEqual([450, 450, 101])
    expect([...fake.docs.keys()].filter((path) => path.includes('eventMonths'))).toHaveLength(1000)
  })
})

describe('pull', () => {
  test('an empty account has nothing and keeps a null cursor', async () => {
    expect(await remote.pull('u1', null)).toEqual({ events: [], preferences: [], cursor: null })
  })

  test('reads every month and the preferences, and returns the newest updatedAt as cursor', async () => {
    await remote.push('u1', {
      events: [event({ logDay: '2025-10-09' }), event({ at: 2, logDay: '2025-11-02' })],
      preferences: [pref('theme', '"dark"', 7)],
    })
    const pulled = await remote.pull('u1', null)
    expect(pulled.events).toHaveLength(2)
    expect(pulled.preferences).toEqual([pref('theme', '"dark"', 7)])
    expect(pulled.cursor).toBe('1.0')
  })

  test('only months written after the cursor come back, and the cursor advances', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    const first = await remote.pull('u1', null)
    await remote.push('u1', { events: [event({ at: 2, logDay: '2025-12-01' })], preferences: [] })

    const second = await remote.pull('u1', first.cursor)
    expect(second.events.map((e) => e.logDay)).toEqual(['2025-12-01'])
    expect(second.cursor).not.toBe(first.cursor)
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

  test('a month without a server time does not move the cursor', async () => {
    fake.docs.set('users/u1/eventMonths/2025-10', {
      events: { [eventKey(event())]: { l: '2025-10-09', d: null } },
    })
    const pulled = await remote.pull('u1', null)
    expect(pulled.events).toHaveLength(1)
    expect(pulled.cursor).toBeNull()
  })

  test("does not read another user's data", async () => {
    await remote.push('u1', { events: [event()], preferences: [pref('a', '1')] })
    expect(await remote.pull('u2', null)).toEqual({ events: [], preferences: [], cursor: null })
  })
})

describe('erase', () => {
  test('deletes every month, the preferences, and the user documents, only for that user; keeps feedback and its limit', async () => {
    await remote.push('u1', {
      events: [event(), event({ at: 2, logDay: '2025-11-02' })],
      preferences: [pref('a', '1')],
    })
    await remote.push('u2', { events: [event()], preferences: [] })

    fake.docs.set('feedbackLimits/u1', { lastAt: 1 })
    fake.docs.set('feedbackLimits/u2', { lastAt: 1 })
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
    for (let i = 1; i <= 500; i++) {
      fake.docs.set(`users/u1/eventMonths/${String(i).padStart(4, '0')}-01`, { events: {} })
    }
    await remote.erase('u1')
    expect(fake.batches).toEqual([450, 52])
    expect(fake.docs.size).toBe(0)
  })

  test('a push afterwards recreates the user document', async () => {
    await remote.push('u1', { events: [event()], preferences: [] })
    await remote.erase('u1')
    await remote.push('u1', { events: [event()], preferences: [] })
    expect(stored('users/u1')).toMatchObject({ schema: 1 })
  })
})
