import { afterAll, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote, type MemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud, PushChanges, SyncEvent } from '@ihsaanly/cloud/ports'
import { z } from 'zod'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

await withDom()
const backend = await import('../storage/backend')
const { allActions } = await import('../storage/events')
const { recentFailures } = await import('../storage/log')
const { createPreferenceStore } = await import('../storage/preference-store')
const { writePreference } = await import('../storage/preferences')
const session = await import('./session')

const hijri = createPreferenceStore('hijriOffset', z.number(), 0)
const settle = (ms = 30): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const asr = (at: number): SyncEvent => ({
  kind: 'prayer-performed',
  subject: 'asr',
  at,
  logDay: '2026-10-03',
  deltaSeconds: null,
})

/** Another device on the same account: it writes straight to the remote. */
const elsewhere = (remote: MemorySyncRemote, changes: Partial<PushChanges>): Promise<void> =>
  remote.push('me', { events: [], preferences: [], ...changes })

describe('live updates while the app is open', () => {
  let remote: MemorySyncRemote
  let cloud: Cloud
  let pulls = 0
  let pushes: PushChanges[] = []
  let stop: () => void = () => {}

  const signedIn = async (opts: Parameters<typeof session.startCloud>[1] = {}): Promise<void> => {
    stop = session.startCloud(async () => cloud, { debounceMs: 5, ...opts })
    await session.signIn('apple')
    await session.syncNow()
  }

  afterAll(() => stop())

  beforeEach(() => {
    stop()
    resetStorage()
    setSystemTime()
    pulls = 0
    pushes = []
    remote = createMemorySyncRemote()
    const pull = remote.pull
    const push = remote.push
    remote.pull = (...args) => {
      pulls += 1
      return pull(...args)
    }
    remote.push = (uid, changes) => {
      pushes.push(changes)
      return push(uid, changes)
    }
    cloud = { auth: createMemoryAuth({ uid: 'me' }), remote, feedback: createMemoryFeedback() }
  })

  it('watches after the first sync and applies what another device writes, with no pull', async () => {
    await signedIn()
    expect(remote.watchers()).toBe(1)
    const before = pulls

    await elsewhere(remote, {
      events: [asr(5_000)],
      preferences: [{ key: 'hijriOffset', value: '2', updatedAt: Date.now() + 1_000 }],
    })
    await settle()

    expect(allActions().map((action) => action.subject)).toContain('asr')
    expect(hijri.get()).toBe(2)
    expect(pulls).toBe(before)
    // Applied as synced: the next round has nothing to push back.
    const pushed = pushes.length
    await session.syncNow()
    expect(pushes.length).toBe(pushed)
  })

  it('a foreground while watching does nothing more', async () => {
    await signedIn()
    const before = pulls
    session.notifyForeground()
    await settle()
    expect(pulls).toBe(before)
    expect(remote.watchers()).toBe(1)
  })

  it('stops in the background; a throttled foreground re-attaches and catches up without a pull', async () => {
    await signedIn()
    session.notifyBackground()
    expect(remote.watchers()).toBe(0)

    await elsewhere(remote, { events: [asr(6_000)] })
    await settle()
    expect(allActions().some((action) => action.subject === 'asr')).toBe(false)

    const before = pulls
    session.notifyForeground()
    await settle()
    expect(remote.watchers()).toBe(1)
    expect(pulls).toBe(before)
    expect(allActions().some((action) => action.subject === 'asr')).toBe(true)
  })

  it('past the throttle, a foreground syncs first, then watches', async () => {
    setSystemTime(new Date(1_000_000))
    await signedIn()
    session.notifyBackground()
    // A sync round in the background does not attach the listener.
    await session.syncNow()
    expect(remote.watchers()).toBe(0)

    setSystemTime(new Date(1_000_000 + session.FOREGROUND_SYNC_INTERVAL_MS))
    const before = pulls
    session.notifyForeground()
    await settle()
    expect(pulls).toBe(before + 1)
    expect(remote.watchers()).toBe(1)
    setSystemTime()
  })

  it('a throttled foreground does not watch a device that is not settled', async () => {
    await signedIn()
    session.notifyBackground()
    const pull = remote.pull
    remote.pull = async () => {
      throw new Error('boom')
    }
    await session.syncNow()
    remote.pull = pull
    session.notifyForeground()
    await settle()
    expect(remote.watchers()).toBe(0)
  })

  it('signing out, losing the session, or deleting the account stops the listener', async () => {
    await signedIn()
    await session.signOut('keep')
    expect(remote.watchers()).toBe(0)

    await session.signIn('apple')
    await settle()
    expect(remote.watchers()).toBe(1)
    await cloud.auth.signOut()
    expect(remote.watchers()).toBe(0)

    await session.signIn('apple')
    await settle()
    expect(remote.watchers()).toBe(1)
    await session.deleteAccount('keep')
    expect(remote.watchers()).toBe(0)
  })

  it('a cancelled delete puts the listener back', async () => {
    await signedIn()
    cloud.auth.deleteAccount = async () => {
      throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
    }
    await session.deleteAccount('keep')
    await settle()
    expect(remote.watchers()).toBe(1)
  })

  it('switching accounts drops the old listener before the new one syncs', async () => {
    await signedIn()
    const auth = cloud.auth as ReturnType<typeof createMemoryAuth>
    // A second account signing in on top: the listener follows the new uid.
    await auth.signOut()
    cloud.auth.signIn = async () => ({
      uid: 'other',
      email: null,
      displayName: null,
      provider: 'apple',
      providers: ['apple'],
    })
    await session.signIn('apple')
    await settle()
    expect(session.getAccountState().status).toBe('account-mismatch')
    expect(remote.watchers()).toBe(0)

    await session.resolveMismatch('merge')
    expect(remote.watchers()).toBe(1)
  })

  it('a listener failure is noted, and the next foreground attaches another', async () => {
    let fail: ((error: unknown) => void) | undefined
    const watch = remote.watch
    remote.watch = (uid, cursor, onChanges, onError) => {
      fail = onError
      return watch(uid, cursor, onChanges)
    }
    await signedIn()
    fail?.(new Error('permission-denied'))
    expect(recentFailures().at(-1)?.label).toBe('cloudWatch')

    session.notifyForeground()
    await settle()
    // Throttled, so no round: the listener is simply attached again.
    expect(remote.watchers()).toBe(2)
  })

  it('changes that cannot be applied are noted, not thrown', async () => {
    await signedIn()
    await elsewhere(remote, { events: [{ ...asr(7_000), subject: {} as never }] })
    await settle()
    expect(recentFailures().at(-1)?.label).toBe('cloudWatchApply')
  })

  it('what arrives after the listener was dropped is left for the next round', async () => {
    let deliver:
      | ((changes: Parameters<Parameters<MemorySyncRemote['watch']>[2]>[0]) => void)
      | undefined
    remote.watch = (_uid, _cursor, onChanges) => {
      deliver = onChanges
      return () => {}
    }
    await signedIn()
    session.notifyBackground()
    deliver?.({ events: [asr(8_000)], preferences: [], cursor: '99' })
    await settle()
    expect(allActions().some((action) => action.subject === 'asr')).toBe(false)
  })

  it('a remote without a listener is synced by rounds alone', async () => {
    const { watch: _watch, ...rest } = remote
    cloud = { ...cloud, remote: rest }
    await signedIn()
    expect(session.getAccountState().status).toBe('idle')
    expect(remote.watchers()).toBe(0)
  })

  it('a merged progress value is pushed soon after it arrives', async () => {
    await signedIn({ progressDebounceMs: 5 })
    const day = '2026-10-03:morning'
    const value = (count: number, parts: string[], at: number): string =>
      JSON.stringify({ periodKey: day, count, parts, updatedAt: at })
    writePreference('progress:tasbih', JSON.parse(value(3, ['a'], 10)))
    await settle()
    const before = pushes.length

    // Both devices counted since they last agreed.
    backend.writePreferenceRowAt('progress:tasbih', value(5, ['a'], 20), 20)
    await elsewhere(remote, {
      preferences: [{ key: 'progress:tasbih', value: value(4, ['b'], 21), updatedAt: 21 }],
    })
    await settle()

    const merged = value(5, ['a', 'b'], 21)
    expect(backend.readPreferenceRow('progress:tasbih')?.value).toBe(merged)
    expect(pushes.length).toBeGreaterThan(before)
    expect((await remote.pull('me', null)).preferences).toContainEqual({
      key: 'progress:tasbih',
      value: merged,
      updatedAt: 22,
    })
  })
})

describe('push timing', () => {
  let remote: MemorySyncRemote
  let pushes = 0
  let stop: () => void = () => {}

  afterAll(() => stop())

  beforeEach(async () => {
    stop()
    resetStorage()
    pushes = 0
    remote = createMemorySyncRemote()
    const push = remote.push
    remote.push = (uid, changes) => {
      pushes += 1
      return push(uid, changes)
    }
    stop = session.startCloud(
      async () => ({
        auth: createMemoryAuth({ uid: 'me' }),
        remote,
        feedback: createMemoryFeedback(),
      }),
      { debounceMs: 150, progressDebounceMs: 10 },
    )
    await session.signIn('apple')
    await session.syncNow()
    pushes = 0
  })

  it('progress pushes after the short debounce, other keys after the long one', async () => {
    writePreference('progress:x', { periodKey: 'd:day', count: 1, parts: [], updatedAt: 1 })
    await settle(60)
    expect(pushes).toBe(1)

    writePreference('hijriOffset', 1)
    await settle(60)
    expect(pushes).toBe(1)
    await settle(150)
    expect(pushes).toBe(2)
  })

  it('a progress write brings a pending slower push forward, and a slower write does not delay it', async () => {
    writePreference('hijriOffset', 1)
    writePreference('progress:x', { periodKey: 'd:day', count: 1, parts: [], updatedAt: 1 })
    writePreference('theme', 'dark')
    await settle(60)
    expect(pushes).toBe(1)
    const keys = (await remote.pull('me', null)).preferences.map((preference) => preference.key)
    expect(keys.sort()).toEqual(['hijriOffset', 'progress:x', 'theme'])
  })
})
