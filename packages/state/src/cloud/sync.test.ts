import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud } from '@ihsaanly/cloud/ports'
import { z } from 'zod'

/**
 * Everything here runs over the web backend: the native one needs expo-sqlite,
 * and the two expose the same functions. localStorage has to exist before the
 * backend is imported, and the backend has to be swapped in before anything
 * that imports it is.
 */
const data = new Map<string, string>()
;(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => {
    data.set(key, value)
  },
}

const backend = (await import(
  '../storage/backend.web?cloud' as string
)) as typeof import('../storage/backend.web')
mock.module('../storage/backend', () => backend)

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
    expect(local.readMeta()).toEqual({ boundUid: null, cursor: null, lastSyncedAt: null })

    local.writeMeta({ boundUid: 'u', cursor: '3', lastSyncedAt: 9 })
    expect(local.readMeta()).toEqual({ boundUid: 'u', cursor: '3', lastSyncedAt: 9 })
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

  beforeEach(() => {
    stop()
    backend.wipe()
    loads = 0
    cloud = { auth: createMemoryAuth({ uid: 'me' }), remote: createMemorySyncRemote() }
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

  it('asks before merging into a different account, then merges', async () => {
    createLocalStore().writeMeta({ boundUid: 'someone-else', cursor: null, lastSyncedAt: null })
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
    cloud = { auth: createMemoryAuth(), remote: createMemorySyncRemote() }
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

  beforeEach(() => {
    stop()
    backend.wipe()
    // The onboarding store caches what it read; another test may have filled it.
    reloadPreferences()
    cloud = { auth: createMemoryAuth({ uid: 'me' }), remote: createMemorySyncRemote() }
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
