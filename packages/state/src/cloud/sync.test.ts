import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { freshMeta, SYNC_META_VERSION } from '@ihsaanly/cloud/engine'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud, PushChanges } from '@ihsaanly/cloud/ports'
import { z } from 'zod'

import '../../test/native'

/** Everything here runs the native backend, over SQLite, with the native modules faked. */
const backend = await import('../storage/backend')

const { createLocalStore } = await import('./local-store')
const { createPreferenceStore, reloadPreferences } = await import('../storage/preference-store')
const { allActions, recordEvent } = await import('../storage/events')
const { buildExport } = await import('../data/export')
const session = await import('./session')
const { restoreOutcomeOf } = await import('./restore')
const { getOnboarding } = await import('../onboarding/store')

const hijri = createPreferenceStore('hijriOffset', z.number(), 0)

const settle = (ms = 30): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const EVENT = {
  kind: 'prayer-performed',
  subject: 'fajr',
  at: 1_000,
  logDay: '2026-09-22',
  deltaSeconds: null,
}

describe('the local store', () => {
  beforeEach(() => {
    backend.wipe()
  })

  it('offers only allowlisted preferences to sync', () => {
    ;['sync', 'account', 'failureLog', 'qadaProcessedThrough', 'locale'].forEach((key) =>
      backend.writePreferenceRowAt(key, '"x"', 7),
    )

    expect(createLocalStore().preferences()).toEqual([
      { key: 'locale', value: '"x"', updatedAt: 7 },
    ])
  })

  it('rounds the place to about 1 km on the way out, leaving the local row alone', () => {
    const place = {
      label: 'Toronto',
      latitude: 43.653226,
      longitude: -79.383184,
      timeZone: 'America/Toronto',
      source: 'device',
    }
    backend.writePreferenceRowAt('place', JSON.stringify(place), 7)

    const [row] = createLocalStore().preferences()
    expect(JSON.parse(row?.value ?? 'null')).toEqual({
      ...place,
      latitude: 43.65,
      longitude: -79.38,
    })
    expect(backend.preferenceRowsWithTime()[0]?.value).toBe(JSON.stringify(place))
  })

  it('sends a place it cannot read as it is, rather than failing the sync', () => {
    backend.writePreferenceRowAt('place', '{"oops', 7)

    expect(createLocalStore().preferences()).toContainEqual({
      key: 'place',
      value: '{"oops',
      updatedAt: 7,
    })
  })

  it('sends a place without coordinates as it is', () => {
    backend.writePreferenceRowAt('place', 'null', 7)

    expect(
      createLocalStore()
        .preferences()
        .find((row) => row.key === 'place')?.value,
    ).toBe('null')
  })

  it('never offers the exact home region to sync', () => {
    backend.writePreferenceRowAt('events', '{"home":{"latitude":1.23456,"longitude":2.34567}}', 7)
    expect(createLocalStore().preferences()).toEqual([])
  })

  it('applies preferences with their own stamps and refreshes cached readers', () => {
    // Read once so the value is cached; the apply has to drop that cache.
    expect(hijri.get()).toBe(0)

    createLocalStore().applyPreferences([
      { key: 'hijriOffset', value: '1', updatedAt: 5 },
      { key: 'failureLog', value: '[]', updatedAt: 5 },
    ])

    expect(hijri.get()).toBe(1)
    expect(backend.preferenceRowsWithTime()).toEqual([
      { key: 'hijriOffset', value: '1', updatedAt: 5 },
    ])
  })

  it('defaults meta and round-trips it', () => {
    const local = createLocalStore()
    expect(local.readMeta()).toEqual(freshMeta(null))

    const meta = {
      ...freshMeta('u'),
      cursor: '3',
      lastSyncedAt: 9,
      profileWritten: true,
      syncedPreferences: { theme: 4 },
    }
    local.writeMeta(meta)
    expect(local.readMeta()).toEqual(meta)
  })

  it('reads meta from before layout 2 as version 1, keeping the account it is bound to', () => {
    backend.writePreferenceRow(
      'sync',
      JSON.stringify({ boundUid: 'u', cursor: '1.0', lastSyncedAt: 9 }),
    )
    expect(createLocalStore().readMeta()).toEqual({
      version: 1,
      boundUid: 'u',
      cursor: '1.0',
      lastSyncedAt: 9,
      profileWritten: false,
      syncedPreferences: {},
    })
  })

  it('inserts remote events as synced and makes readers see them', () => {
    const local = createLocalStore()
    expect(local.insertRemoteEvents([EVENT, EVENT])).toBe(1)
    expect(local.unsyncedEvents()).toEqual([])
    expect(allActions()).toHaveLength(1)
  })

  it('keeps sync bookkeeping out of an export', () => {
    backend.writePreferenceRow('sync', '{}')
    backend.writePreferenceRow('account', '{"signedIn":true}')
    backend.writePreferenceRow('hijriOffset', '2')

    expect(Object.keys(buildExport().preferences)).toEqual(['hijriOffset'])
  })
})

describe('the cloud session', () => {
  let loads = 0
  let cloud: Cloud
  let stop: () => void = () => {}

  const start = (): void => {
    stop = session.startCloud(
      async () => {
        loads += 1
        return cloud
      },
      { debounceMs: 5 },
    )
  }

  afterAll(() => stop())

  beforeEach(() => {
    stop()
    backend.wipe()
    loads = 0
    cloud = {
      auth: createMemoryAuth({ uid: 'me' }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
  })

  it('never loads the cloud for someone who has not signed in', async () => {
    start()
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    session.notifyForeground()
    await settle()

    expect(loads).toBe(0)
    expect(session.getAccountState().status).toBe('signed-out')
  })

  it('signs in, pushes what the device has, and restores on the next launch', async () => {
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    start()

    await session.signIn('apple')
    await session.syncNow()
    expect(session.getAccountState()).toMatchObject({
      status: 'idle',
      account: { uid: 'me' },
      error: null,
    })
    expect((await cloud.remote.pull('me', null)).events).toHaveLength(1)

    stop()
    start()
    expect(loads).toBe(2)
    await settle()
    expect(session.getAccountState()).toMatchObject({ status: 'idle', account: { uid: 'me' } })
  })

  it('pushes a local write after it settles', async () => {
    start()
    await session.signIn('apple')
    await session.syncNow()

    recordEvent({ kind: 'prayer-performed', subject: 'dhuhr', at: new Date(2_000), logDay: 'd' })
    await settle()

    expect((await cloud.remote.pull('me', null)).events.map((event) => event.subject)).toEqual([
      'dhuhr',
    ])
  })

  it('moves a device that synced in layout 1 into the current layout on its next sync', async () => {
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    backend.writePreferenceRowAt('hijriOffset', '1', 7)
    const local = createLocalStore()
    local.markSynced(local.unsyncedEvents().map((event) => event.id))
    // What a layout-1 client left behind: bound, everything pushed, an old cursor.
    backend.writePreferenceRow(
      'sync',
      JSON.stringify({ boundUid: 'me', cursor: '1.0', lastSyncedAt: 5 }),
    )
    const pushes: PushChanges[] = []
    const push = cloud.remote.push
    cloud.remote.push = (uid, changes) => {
      pushes.push(changes)
      return push(uid, changes)
    }

    start()
    await session.signIn('apple')
    await session.syncNow()
    await session.syncNow()

    expect(pushes[0]).toMatchObject({
      events: [{ kind: 'prayer-performed', subject: 'fajr' }],
      preferences: [{ key: 'hijriOffset', value: '1', updatedAt: 7 }],
      profile: true,
    })
    // Once: the next sync has nothing to push, the profile included.
    expect(pushes).toHaveLength(1)
    expect(createLocalStore().readMeta()).toMatchObject({
      version: SYNC_META_VERSION,
      boundUid: 'me',
      profileWritten: true,
      syncedPreferences: { hijriOffset: 7 },
    })
  })

  it('asks before merging into a different account, then merges', async () => {
    createLocalStore().writeMeta(freshMeta('someone-else'))
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    start()

    await session.signIn('apple')
    await session.syncNow()
    expect(session.getAccountState()).toMatchObject({
      status: 'account-mismatch',
      mismatchUid: 'someone-else',
    })

    await session.resolveMismatch('merge')
    expect(session.getAccountState().status).toBe('idle')
    expect((await cloud.remote.pull('me', null)).events).toHaveLength(1)
  })

  it('signs out and removes local data only after a final sync', async () => {
    let wiped = 0
    stop = session.startCloud(async () => cloud, {
      debounceMs: 5,
      onWiped: () => {
        wiped += 1
      },
    })
    await session.signIn('apple')
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })

    await session.signOut('remove')

    expect(wiped).toBe(1)
    expect(allActions()).toEqual([])
    expect(session.getAccountState().status).toBe('signed-out')
    expect((await cloud.remote.pull('me', null)).events).toHaveLength(1)
  })

  it('treats a closed sign-in popup as no error at all', async () => {
    const auth = cloud.auth
    cloud = {
      ...cloud,
      auth: {
        ...auth,
        signIn: async () => {
          throw Object.assign(new Error('Firebase: popup closed'), {
            code: 'auth/popup-closed-by-user',
          })
        },
      },
    }
    start()

    await session.signIn('google')
    expect(session.getAccountState()).toMatchObject({ status: 'signed-out', error: null })
  })

  it('reports a failed sign-in as a code, never the raw message', async () => {
    const auth = cloud.auth
    cloud = {
      ...cloud,
      auth: {
        ...auth,
        signIn: async () => {
          throw Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), {
            code: 'auth/network-request-failed',
          })
        },
      },
    }
    start()

    await session.signIn('google')
    expect(session.getAccountState()).toMatchObject({ status: 'signed-out', error: 'network' })
  })

  it('asks to link when the email has an account on the other provider, then links', async () => {
    cloud = {
      auth: createMemoryAuth({
        uid: 'me',
        seed: [{ uid: 'me', email: 'aisha@example.test', providers: ['apple'] }],
        emails: { apple: 'aisha@example.test', google: 'aisha@example.test' },
      }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    start()

    await session.signIn('google')
    expect(session.getAccountState()).toMatchObject({
      status: 'link-required',
      account: null,
      error: null,
      link: { existing: 'apple', attempted: 'google' },
    })

    await session.signIn('apple')
    await session.syncNow()
    const state = session.getAccountState()
    expect(state).toMatchObject({
      status: 'idle',
      account: { uid: 'me', providers: ['apple', 'google'] },
    })
    expect(state.link).toBeUndefined()
  })

  it('keeps the link prompt when its sign-in is closed, and cancelling forgets it', async () => {
    cloud = {
      auth: createMemoryAuth({
        seed: [{ uid: 'me', email: 'aisha@example.test', providers: ['apple'] }],
        emails: { apple: 'aisha@example.test', google: 'aisha@example.test' },
      }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    start()
    await session.signIn('google')
    const auth = cloud.auth
    const realSignIn = auth.signIn
    auth.signIn = async () => {
      throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
    }

    await session.signIn('apple')
    expect(session.getAccountState()).toMatchObject({ status: 'link-required', error: null })

    await session.cancelLink()
    expect(session.getAccountState()).toMatchObject({ status: 'signed-out', link: undefined })

    auth.signIn = realSignIn
    await session.signIn('apple')
    expect(session.getAccountState().account?.providers).toEqual(['apple'])
  })

  it('links a second method from the signed-in account', async () => {
    start()
    await session.signIn('apple')
    await session.syncNow()

    await session.linkProvider('google')
    expect(session.getAccountState()).toMatchObject({
      status: 'idle',
      account: { uid: 'me', providers: ['apple', 'google'] },
    })
  })

  it('reports a method that belongs to another account as link-conflict', async () => {
    cloud = {
      auth: createMemoryAuth(),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    await cloud.auth.signIn('google')
    await cloud.auth.signOut()
    start()
    await session.signIn('apple')
    await session.syncNow()

    await session.linkProvider('google')
    expect(session.getAccountState()).toMatchObject({
      status: 'error',
      error: 'link-conflict',
      account: { providers: ['apple'] },
    })
  })

  it('reports deleting where no linked method can sign in as reauth-unavailable', async () => {
    cloud = {
      auth: createMemoryAuth({ uid: 'me', available: ['google'] }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    start()
    await session.signIn('apple')
    await session.syncNow()

    await session.deleteAccount('keep')
    expect(session.getAccountState()).toMatchObject({
      status: 'error',
      error: 'reauth-unavailable',
      account: { uid: 'me' },
    })
  })

  it('removes nothing when the final sync cannot reach the account', async () => {
    start()
    await session.signIn('apple')
    await session.syncNow()
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    cloud.remote.push = async () => {
      throw new Error('offline')
    }

    await session.signOut('remove')
    expect(session.getAccountState()).toMatchObject({ status: 'error', error: 'remove-blocked' })
    expect(allActions()).toHaveLength(1)
  })
})

describe('restoring from onboarding', () => {
  let cloud: Cloud
  let stop: () => void = () => {}

  const outcome = (): string => restoreOutcomeOf(session.getAccountState(), getOnboarding())

  afterAll(() => stop())

  beforeEach(() => {
    stop()
    backend.wipe()
    // The onboarding store caches what it read; another test may have filled it.
    reloadPreferences()
    cloud = {
      auth: createMemoryAuth({ uid: 'me' }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    stop = session.startCloud(async () => cloud, { debounceMs: 5 })
  })

  it('is idle before anyone signs in', () => {
    expect(outcome()).toBe('idle')
  })

  it('lands as restored when the account finished onboarding elsewhere', async () => {
    await cloud.remote.push('me', {
      events: [],
      preferences: [
        {
          key: 'onboarding',
          value: JSON.stringify({ completed: true, gender: 'female', completedAt: '2026-01-01' }),
          updatedAt: 10,
        },
        { key: 'hijriOffset', value: '1', updatedAt: 10 },
      ],
    })
    expect(getOnboarding().completed).toBe(false)

    await session.signIn('google')
    // The first sync is under way as soon as the account is known.
    expect(outcome()).toBe('restoring')

    await session.syncNow()
    expect(outcome()).toBe('restored')
    expect(getOnboarding()).toMatchObject({ completed: true, gender: 'female' })
  })

  it('asks to continue setup when the account never finished it', async () => {
    await session.signIn('google')
    await session.syncNow()

    expect(session.getAccountState()).toMatchObject({ status: 'idle', account: { uid: 'me' } })
    expect(outcome()).toBe('needs-setup')
  })

  it('leaves errors to the Account screen', async () => {
    cloud.remote.pull = async () => {
      throw new Error('offline')
    }
    await session.signIn('google')
    await session.syncNow()

    expect(session.getAccountState().status).toBe('error')
    expect(outcome()).toBe('idle')
  })
})
