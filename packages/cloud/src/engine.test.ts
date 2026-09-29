import { describe, expect, test } from 'bun:test'
import { adoptAccount, syncOnce } from './engine'
import { createMemoryAuth } from './memory/auth'
import { createMemoryLocalStore } from './memory/local-store'
import { createMemorySyncRemote } from './memory/sync-remote'
import type { SyncEvent, SyncPreference } from './ports'

const event = (at: number, subject = 'item-1', kind = 'review'): SyncEvent => ({
  kind,
  subject,
  at,
  logDay: '2026-01-01',
  deltaSeconds: null,
})

const identities = (store: ReturnType<typeof createMemoryLocalStore>): string[] =>
  store
    .events()
    .map((e) => `${e.at}|${e.kind}|${e.subject}`)
    .sort()

describe('events', () => {
  test('two devices converge through a shared remote', async () => {
    const remote = createMemorySyncRemote()
    const a = createMemoryLocalStore()
    const b = createMemoryLocalStore()
    a.record(event(1, 'a'))
    b.record(event(2, 'b'))

    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')
    await syncOnce(a, remote, 'u')

    expect(identities(a)).toEqual(['1|review|a', '2|review|b'])
    expect(identities(b)).toEqual(identities(a))
  })

  test('offline events flush in one push and are marked synced', async () => {
    const remote = createMemorySyncRemote()
    const store = createMemoryLocalStore()
    store.record(event(1))
    store.record(event(2))
    store.record(event(3))
    expect(store.unsyncedEvents()).toHaveLength(3)

    const outcome = await syncOnce(store, remote, 'u')

    expect(outcome).toEqual({ status: 'synced', pulledEvents: 0, pushedEvents: 3 })
    expect(store.unsyncedEvents()).toHaveLength(0)
    expect(store.events().every((e) => e.synced)).toBe(true)
    expect((await remote.pull('u', null)).events).toHaveLength(3)
  })

  test('re-sync is idempotent', async () => {
    const remote = createMemorySyncRemote()
    const store = createMemoryLocalStore()
    store.record(event(1))
    await syncOnce(store, remote, 'u', () => 100)

    const second = await syncOnce(store, remote, 'u', () => 200)

    expect(second).toEqual({ status: 'synced', pulledEvents: 0, pushedEvents: 0 })
    expect(store.events()).toHaveLength(1)
    expect(store.readMeta().lastSyncedAt).toBe(200)
  })
})

describe('preferences', () => {
  const pref = (key: string, value: string, updatedAt: number): SyncPreference => ({
    key,
    value,
    updatedAt,
  })

  test('newer local value is pushed', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [], preferences: [pref('theme', '"light"', 10)] })
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 20)

    await syncOnce(store, remote, 'u')

    expect((await remote.pull('u', null)).preferences).toEqual([pref('theme', '"dark"', 20)])
    expect(store.preferences()).toEqual([pref('theme', '"dark"', 20)])
  })

  test('newer remote value is applied', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [], preferences: [pref('theme', '"light"', 30)] })
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 20)

    await syncOnce(store, remote, 'u')

    expect(store.preferences()).toEqual([pref('theme', '"light"', 30)])
    expect((await remote.pull('u', null)).preferences).toEqual([pref('theme', '"light"', 30)])
  })

  test('a tie with a different value takes the remote', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [], preferences: [pref('theme', '"light"', 20)] })
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 20)

    await syncOnce(store, remote, 'u')

    expect(store.preferences()).toEqual([pref('theme', '"light"', 20)])
  })

  test('a tie with the same value changes nothing', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [], preferences: [pref('theme', '"dark"', 20)] })
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 20)

    await syncOnce(store, remote, 'u')

    expect(store.preferences()).toEqual([pref('theme', '"dark"', 20)])
    expect((await remote.pull('u', null)).preferences).toEqual([pref('theme', '"dark"', 20)])
  })

  test('a legacy 0-stamped local value loses to the cloud value', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [], preferences: [pref('theme', '"light"', 5)] })
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 0)

    await syncOnce(store, remote, 'u')

    expect(store.preferences()).toEqual([pref('theme', '"light"', 5)])
  })

  test('a local key absent remotely is pushed', async () => {
    const remote = createMemorySyncRemote()
    const store = createMemoryLocalStore()
    store.setPreference('language', '"ar"', 0)

    await syncOnce(store, remote, 'u')

    expect((await remote.pull('u', null)).preferences).toEqual([pref('language', '"ar"', 0)])
  })
})

describe('accounts', () => {
  test('first sign-in merges device data with the account into a union', async () => {
    const remote = createMemorySyncRemote()
    const other = createMemoryLocalStore()
    other.record(event(1, 'cloud'))
    await syncOnce(other, remote, 'u')

    const device = createMemoryLocalStore()
    device.record(event(2, 'local'))
    const outcome = await syncOnce(device, remote, 'u')

    expect(outcome).toEqual({ status: 'synced', pulledEvents: 1, pushedEvents: 1 })
    expect(identities(device)).toEqual(['1|review|cloud', '2|review|local'])
    expect((await remote.pull('u', null)).events).toHaveLength(2)
  })

  test('a different account is a mismatch, and merge pushes the whole log', async () => {
    const remote = createMemorySyncRemote()
    const auth = createMemoryAuth()
    const device = createMemoryLocalStore()
    device.record(event(1, 'old'))
    await syncOnce(device, remote, 'first')
    device.record(event(2, 'newer'))

    const second = createMemoryAuth({ uid: 'second' })
    const account = await second.signIn('google')
    expect(auth.current()).toBeNull()

    const outcome = await syncOnce(device, remote, account.uid)
    expect(outcome).toEqual({ status: 'account-mismatch', boundUid: 'first' })
    expect((await remote.pull('second', null)).events).toHaveLength(0)

    adoptAccount(device, account.uid, 'merge')
    const merged = await syncOnce(device, remote, account.uid)

    expect(merged).toMatchObject({ status: 'synced', pushedEvents: 2 })
    expect((await remote.pull('second', null)).events).toHaveLength(2)
    expect(device.readMeta().boundUid).toBe('second')
  })

  test('adoptAccount fresh resets the cursor without resyncing the log', async () => {
    const remote = createMemorySyncRemote()
    const device = createMemoryLocalStore()
    device.record(event(1))
    await syncOnce(device, remote, 'first')
    expect(device.readMeta().cursor).not.toBeNull()

    adoptAccount(device, 'second', 'fresh')

    expect(device.readMeta()).toEqual({ boundUid: 'second', cursor: null, lastSyncedAt: null })
    expect(device.unsyncedEvents()).toHaveLength(0)
  })
})

describe('memory auth', () => {
  test('notifies listeners and erases before deleting', async () => {
    const remote = createMemorySyncRemote()
    const auth = createMemoryAuth()
    const seen: (string | null)[] = []
    auth.onChange((account) => seen.push(account?.uid ?? null))

    const account = await auth.signIn('apple')
    await remote.push(account.uid, { events: [event(1)], preferences: [] })
    await auth.deleteAccount((uid) => remote.erase(uid))

    expect(seen).toEqual([null, account.uid, null])
    expect(auth.current()).toBeNull()
    expect((await remote.pull(account.uid, null)).events).toHaveLength(0)
  })
})
