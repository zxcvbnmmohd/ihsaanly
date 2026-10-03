import { describe, expect, test } from 'bun:test'
import {
  adoptAccount,
  applyRemoteChanges,
  freshMeta,
  newerPreferences,
  SYNC_META_VERSION,
  syncOnce,
} from './engine'
import { createMemoryAuth } from './memory/auth'
import { createMemoryLocalStore } from './memory/local-store'
import { createMemorySyncRemote } from './memory/sync-remote'
import type { PushChanges, SyncEvent, SyncPreference, SyncRemote } from './ports'

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

const pref = (key: string, value: string, updatedAt: number): SyncPreference => ({
  key,
  value,
  updatedAt,
})

/** A remote that records every push, around the memory one. */
function recording(): SyncRemote & { pushes: PushChanges[] } {
  const inner = createMemorySyncRemote()
  const pushes: PushChanges[] = []
  return {
    pushes,
    pull: inner.pull,
    erase: inner.erase,
    push: async (uid, changes) => {
      pushes.push(changes)
      await inner.push(uid, changes)
    },
  }
}

describe('preferences', () => {
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

describe('cost', () => {
  test('a quiet sync pushes nothing: unchanged preferences are not pushed again', async () => {
    const remote = recording()
    const store = createMemoryLocalStore()
    store.setPreference('theme', '"dark"', 20)
    store.record(event(1))
    await syncOnce(store, remote, 'u')
    expect(remote.pushes).toHaveLength(1)

    await syncOnce(store, remote, 'u')
    expect(remote.pushes).toHaveLength(1)

    store.setPreference('theme', '"light"', 30)
    await syncOnce(store, remote, 'u')
    expect(remote.pushes.at(-1)).toEqual({
      events: [],
      preferences: [pref('theme', '"light"', 30)],
      profile: false,
    })
  })

  test('the profile is written on the first push only, per account', async () => {
    const remote = createMemorySyncRemote()
    const store = createMemoryLocalStore()
    await syncOnce(store, remote, 'u')
    expect(remote.profile('u')).toEqual({ schemaVersion: SYNC_META_VERSION })
    expect(store.readMeta().profileWritten).toBe(true)

    await remote.erase('u')
    await syncOnce(store, remote, 'u')
    // Remembered on the device, so not written (or checked) again.
    expect(remote.profile('u')).toBeNull()

    adoptAccount(store, 'v', 'merge')
    await syncOnce(store, remote, 'v')
    expect(remote.profile('v')).toEqual({ schemaVersion: SYNC_META_VERSION })
  })

  test('a profile flag left from another account does not count', async () => {
    const remote = createMemorySyncRemote()
    const store = createMemoryLocalStore()
    store.writeMeta({ ...freshMeta(null), profileWritten: true })
    await syncOnce(store, remote, 'u')
    expect(remote.profile('u')).not.toBeNull()
  })

  test('a remote preference change since the cursor reaches the device', async () => {
    const remote = createMemorySyncRemote()
    const a = createMemoryLocalStore()
    const b = createMemoryLocalStore()
    a.setPreference('theme', '"dark"', 10)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')
    expect(b.preferences()).toEqual([pref('theme', '"dark"', 10)])

    b.setPreference('theme', '"light"', 20)
    await syncOnce(b, remote, 'u')
    await syncOnce(a, remote, 'u')
    expect(a.preferences()).toEqual([pref('theme', '"light"', 20)])
  })
})

describe('layout migration', () => {
  test('a device that synced in an older layout pushes everything again, once', async () => {
    const store = createMemoryLocalStore()
    store.record(event(1))
    store.setPreference('theme', '"dark"', 20)
    await syncOnce(store, createMemorySyncRemote(), 'u', () => 100)
    // The new layout starts empty; this device's data is only in the old one.
    const remote = recording()
    // As a layout-1 client would have left it: everything synced, an old cursor.
    store.writeMeta({
      ...store.readMeta(),
      version: 1,
      cursor: '99',
      profileWritten: false,
      syncedPreferences: { theme: 20 },
    })

    const outcome = await syncOnce(store, remote, 'u', () => 200)

    expect(outcome).toEqual({ status: 'synced', pulledEvents: 0, pushedEvents: 1 })
    expect(remote.pushes).toEqual([
      { events: [event(1)], preferences: [pref('theme', '"dark"', 20)], profile: true },
    ])
    expect(store.readMeta()).toMatchObject({
      version: SYNC_META_VERSION,
      boundUid: 'u',
      lastSyncedAt: 200,
      profileWritten: true,
      syncedPreferences: { theme: 20 },
    })

    await syncOnce(store, remote, 'u')
    expect(remote.pushes).toHaveLength(1)
  })

  test('a failed migration round is repeated', async () => {
    const inner = createMemorySyncRemote()
    let fail = true
    const remote: SyncRemote = {
      ...inner,
      push: async (uid, changes) => {
        if (fail) throw new Error('offline')
        await inner.push(uid, changes)
      },
    }
    const store = createMemoryLocalStore()
    store.record(event(1))
    store.writeMeta({ ...freshMeta('u'), version: 1, lastSyncedAt: 5 })
    await expect(syncOnce(store, remote, 'u')).rejects.toThrow('offline')
    expect(store.readMeta()).toMatchObject({ version: 1, lastSyncedAt: 5 })

    fail = false
    await syncOnce(store, remote, 'u')
    expect((await inner.pull('u', null)).events).toEqual([event(1)])
  })

  test('a device bound to another account is asked first, not migrated', async () => {
    const store = createMemoryLocalStore()
    store.record(event(1))
    store.markSynced([1])
    store.writeMeta({ ...freshMeta('first'), version: 1 })
    const outcome = await syncOnce(store, createMemorySyncRemote(), 'second')
    expect(outcome).toEqual({ status: 'account-mismatch', boundUid: 'first' })
    expect(store.unsyncedEvents()).toEqual([])
  })
})

describe('newerPreferences', () => {
  test('without a remote copy, pushes only keys whose timestamp differs from the synced one', () => {
    const local = [pref('a', '1', 1), pref('b', '2', 2), pref('c', '3', 3)]
    expect(newerPreferences(local, [], { a: 1, b: 9 }).toPush).toEqual([
      pref('b', '2', 2),
      pref('c', '3', 3),
    ])
    expect(newerPreferences(local, []).toPush).toEqual(local)
  })

  test('a remote copy decides over the synced stamp', () => {
    expect(newerPreferences([pref('a', '1', 5)], [pref('a', '0', 4)], { a: 5 }).toPush).toEqual([
      pref('a', '1', 5),
    ])
    expect(newerPreferences([pref('a', '1', 5)], [pref('a', '0', 6)], {}).toPush).toEqual([])
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

    expect(device.readMeta()).toEqual(freshMeta('second'))
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

/** A toy commutative merge for set-valued keys: values are JSON string arrays, merged as a sorted union. */
const union = (ours: SyncPreference, theirs: SyncPreference): string | null => {
  if (!ours.key.startsWith('set:')) return null
  const all = new Set([...JSON.parse(ours.value), ...JSON.parse(theirs.value)] as string[])
  return JSON.stringify([...all].sort())
}

describe('merging a key both devices changed', () => {
  test('both sides changed since they last agreed: the merge is applied and pushed, stamped past both', async () => {
    const remote = createMemorySyncRemote()
    const a = createMemoryLocalStore(union)
    const b = createMemoryLocalStore(union)
    a.setPreference('set:x', '["p"]', 10)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')

    a.setPreference('set:x', '["p","q"]', 20)
    b.setPreference('set:x', '["p","r"]', 21)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')
    await syncOnce(a, remote, 'u')

    const merged = pref('set:x', '["p","q","r"]', 22)
    expect(b.preferences()).toEqual([merged])
    expect(a.preferences()).toEqual([merged])
    expect((await remote.pull('u', null)).preferences).toEqual([merged])
  })

  test('only one side changed: newest wins, so a removal on one device is not undone by the merge', async () => {
    const remote = createMemorySyncRemote()
    const a = createMemoryLocalStore(union)
    const b = createMemoryLocalStore(union)
    a.setPreference('set:x', '["p","q"]', 10)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')

    a.setPreference('set:x', '["p"]', 20)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')
    expect(b.preferences()).toEqual([pref('set:x', '["p"]', 20)])
  })

  test('a merge equal to one side keeps that side: theirs applied, or ours pushed when newer', () => {
    const synced = { 'set:x': 1 }
    const plan = newerPreferences(
      [pref('set:x', '["p"]', 5)],
      [pref('set:x', '["p","q"]', 4)],
      synced,
      union,
    )
    expect(plan.toApply).toEqual([pref('set:x', '["p","q"]', 4)])
    expect(plan.toPush).toEqual([])

    const ours = newerPreferences(
      [pref('set:x', '["p","q"]', 5)],
      [pref('set:x', '["p"]', 4)],
      synced,
      union,
    )
    expect(ours.toPush).toEqual([pref('set:x', '["p","q"]', 5)])
    expect(ours.toApply).toEqual([])

    // Ours is the union but older: pushed again with a stamp that wins.
    const older = newerPreferences(
      [pref('set:x', '["p","q"]', 3)],
      [pref('set:x', '["p"]', 4)],
      synced,
      union,
    )
    expect(older.toPush).toEqual([pref('set:x', '["p","q"]', 5)])
  })

  test('a key the merge declines stays newest-wins', () => {
    const plan = newerPreferences([pref('a', '1', 5)], [pref('a', '2', 6)], { a: 1 }, union)
    expect(plan.toApply).toEqual([pref('a', '2', 6)])
  })
})

describe('dropped preferences', () => {
  test('a key this device dropped is removed remotely, and the other device drops it on its next pull', async () => {
    const remote = recording()
    const a = createMemoryLocalStore()
    const b = createMemoryLocalStore()
    a.setPreference('theme', '"dark"', 5)
    a.setPreference('gone', '1', 10)
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')
    expect(b.preferences()).toHaveLength(2)

    a.removePreferences?.(['gone'])
    await syncOnce(a, remote, 'u')
    expect(remote.pushes.at(-1)).toEqual({
      events: [],
      preferences: [],
      removedPreferences: ['gone'],
      profile: false,
    })
    expect(a.readMeta().syncedPreferences).toEqual({ theme: 5 })

    b.setPreference('theme', '"light"', 6)
    await syncOnce(b, remote, 'u')
    expect(b.preferences()).toEqual([pref('theme', '"light"', 6)])
    // Nothing more to remove, and a quiet round pushes nothing.
    const pushes = remote.pushes.length
    await syncOnce(a, remote, 'u')
    await syncOnce(a, remote, 'u')
    expect(remote.pushes.length).toBe(pushes)
  })

  test('a key changed elsewhere after this device dropped it comes back', () => {
    const plan = newerPreferences([], [pref('k', '2', 9)], { k: 5 })
    expect(plan.toApply).toEqual([pref('k', '2', 9)])
    expect(plan.toRemove).toEqual([])
  })

  test('a key changed here is kept even if another device dropped it', () => {
    const plan = newerPreferences([pref('k', '2', 9), pref('j', '1', 1)], [pref('j', '1', 1)], {
      k: 5,
      j: 1,
    })
    expect(plan.toPush).toEqual([pref('k', '2', 9)])
    expect(plan.toDrop).toEqual([])
  })

  test('without a full remote list nothing is dropped here', () => {
    expect(newerPreferences([pref('k', '1', 5)], [], { k: 5 }).toDrop).toEqual([])
  })
})

describe('applyRemoteChanges', () => {
  test('folds in watched changes without reading or writing remotely, and moves the cursor', async () => {
    const remote = createMemorySyncRemote()
    const a = createMemoryLocalStore()
    const b = createMemoryLocalStore()
    await syncOnce(a, remote, 'u')
    await syncOnce(b, remote, 'u')

    const heard: Parameters<typeof applyRemoteChanges>[1][] = []
    const stop = remote.watch('u', b.readMeta().cursor, (changes) => heard.push(changes))
    a.record(event(1))
    a.setPreference('theme', '"dark"', 7)
    await syncOnce(a, remote, 'u')
    stop()

    expect(heard).toHaveLength(1)
    const [changes] = heard
    if (!changes) throw new Error('no changes')
    expect(applyRemoteChanges(b, changes)).toEqual({ pulledEvents: 1, pending: false })
    expect(identities(b)).toEqual(['1|review|item-1'])
    expect(b.preferences()).toEqual([pref('theme', '"dark"', 7)])
    expect(b.readMeta()).toMatchObject({ cursor: changes.cursor, syncedPreferences: { theme: 7 } })

    // Nothing left for b's next round to read or push.
    const pulled = await remote.pull('u', b.readMeta().cursor)
    expect(pulled).toMatchObject({ events: [], preferences: [] })
  })

  test('a merged value stays unsynced and is reported pending; a dropped key leaves the meta', () => {
    const store = createMemoryLocalStore(union)
    store.setPreference('set:x', '["q"]', 6)
    store.setPreference('old', '1', 3)
    store.writeMeta({ ...freshMeta('u'), syncedPreferences: { 'set:x': 5, old: 3 } })

    const outcome = applyRemoteChanges(store, {
      events: [],
      preferences: [pref('set:x', '["p"]', 7)],
      cursor: '9',
    })

    expect(outcome).toEqual({ pulledEvents: 0, pending: true })
    expect(store.preferences()).toEqual([pref('set:x', '["p","q"]', 8)])
    expect(store.readMeta()).toMatchObject({ cursor: '9', syncedPreferences: { 'set:x': 5 } })
  })
})
