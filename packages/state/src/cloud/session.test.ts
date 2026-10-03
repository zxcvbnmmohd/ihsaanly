import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud } from '@ihsaanly/cloud/ports'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('../storage/backend')
const { allActions, lastStorageError, recordEvent } = await import('../storage/events')
const { recentFailures } = await import('../storage/log')
const { createLocalStore } = await import('./local-store')
const session = await import('./session')

const settle = (ms = 30): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const failing = (message: string, code?: string): Error =>
  Object.assign(new Error(message), code === undefined ? {} : { code })

const fajr = {
  kind: 'prayer-performed',
  subject: 'fajr',
  at: new Date(1_000),
  logDay: 'd',
} as const

describe('the cloud session, beyond the happy path', () => {
  let cloud: Cloud
  let loads = 0
  let stop: () => void = () => {}
  let wiped = 0

  const start = (load: () => Promise<Cloud> = async () => cloud): void => {
    stop = session.startCloud(
      () => {
        loads += 1
        return load()
      },
      {
        debounceMs: 5,
        onWiped: () => {
          wiped += 1
        },
      },
    )
  }

  const signedIn = async (): Promise<void> => {
    start()
    await session.signIn('apple')
    await session.syncNow()
  }

  afterAll(() => stop())

  beforeEach(() => {
    stop()
    resetStorage()
    loads = 0
    wiped = 0
    cloud = {
      auth: createMemoryAuth({ uid: 'me' }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
  })

  describe('how failures are named', () => {
    it('says network for a network code, and for a message that sounds like one', async () => {
      start()
      cloud.auth.signIn = async () => {
        throw failing('x', 'unavailable')
      }
      await session.signIn('apple')
      expect(session.getAccountState().error).toBe('network')

      cloud.auth.signIn = async () => {
        throw failing('Failed to fetch')
      }
      await session.signIn('apple')
      expect(session.getAccountState().error).toBe('network')
    })

    it('says auth for any other auth/ code, and the caller fallback otherwise', async () => {
      start()
      cloud.auth.signIn = async () => {
        throw failing('x', 'auth/invalid-credential')
      }
      await session.signIn('apple')
      expect(session.getAccountState().error).toBe('auth')

      cloud.auth.signIn = async () => {
        throw failing('mystery')
      }
      await session.signIn('apple')
      expect(session.getAccountState().error).toBe('auth')
    })

    it('keeps the raw message out of the state and in the failure log', async () => {
      start()
      cloud.auth.signIn = async () => {
        throw failing('secret-token-123 leaked', 'auth/internal-error')
      }
      await session.signIn('apple')

      expect(JSON.stringify(session.getAccountState())).not.toContain('secret-token')
      expect(lastStorageError()).toContain('secret-token-123')
      expect(recentFailures().at(-1)?.label).toBe('cloudSignIn')
    })

    it('treats cancellations as cancellations: numeric code, popup message, closed window', () => {
      expect(session.isCancelled({ code: 12501 })).toBe(true)
      expect(session.isCancelled({ code: 'ERR_REQUEST_CANCELED' })).toBe(true)
      expect(session.isCancelled(new Error('The user did not approve access'))).toBe(true)
      expect(session.isCancelled(new Error('sign-in was cancelled'))).toBe(true)
      expect(session.isCancelled(new Error('network down'))).toBe(false)
      expect(session.isCancelled('plain')).toBe(false)
      expect(session.isCancelled({ code: { nested: true } })).toBe(false)
      expect(session.isCancelled(null)).toBe(false)
    })
  })

  describe('launch', () => {
    it('does not load the cloud when the saved sign-in flag is unreadable', () => {
      backend.writePreferenceRow('account', '{"oops')
      start()
      expect(loads).toBe(0)
    })

    it('does not load the cloud when the saved flag says signed out', () => {
      backend.writePreferenceRow('account', '{"signedIn":false}')
      start()
      expect(loads).toBe(0)
    })

    it('reports a cloud that fails to load, and retries it on the next sign-in', async () => {
      backend.writePreferenceRow('account', '{"signedIn":true}')
      let attempts = 0
      start(async () => {
        attempts += 1
        if (attempts === 1) throw failing('offline: Failed to fetch')
        return cloud
      })
      await settle()

      expect(session.getAccountState()).toMatchObject({ status: 'error', error: 'network' })
      expect(recentFailures().at(-1)?.label).toBe('cloudLoad')

      await session.signIn('apple')
      expect(attempts).toBe(2)
      expect(session.getAccountState().account?.uid).toBe('me')
    })

    it('refuses to sign in before the app has started the cloud', async () => {
      await session.signIn('apple')
      expect(session.getAccountState()).toMatchObject({ status: 'signed-out', error: 'auth' })
    })

    it('goes back to local-only when the session is lost elsewhere', async () => {
      await signedIn()
      expect(backend.readPreferenceRow('account')?.value).toBe('{"signedIn":true}')

      await cloud.auth.signOut()

      expect(session.getAccountState()).toMatchObject({ status: 'signed-out', account: null })
      expect(backend.readPreferenceRow('account')?.value).toBe('{"signedIn":false}')
    })

    it('stays quiet when a session that was never remembered goes away', () => {
      start()
      backend.wipe()
      void cloud.auth.signOut()
      expect(backend.readPreferenceRow('account')).toBeNull()
    })
  })

  describe('syncing', () => {
    it('folds sync requests that arrive mid-sync into one rerun', async () => {
      await signedIn()
      let pulls = 0
      const pull = cloud.remote.pull
      cloud.remote.pull = async (...args) => {
        pulls += 1
        await settle(10)
        return pull(...args)
      }

      await Promise.all([session.syncNow(), session.syncNow(), session.syncNow()])

      expect(pulls).toBe(2)
    })

    it('reports an unclassifiable sync failure as sync, and a network one as network', async () => {
      await signedIn()
      cloud.remote.pull = async () => {
        throw failing('boom')
      }
      await session.syncNow()
      expect(session.getAccountState()).toMatchObject({ status: 'error', error: 'sync' })
      expect(recentFailures().at(-1)?.label).toBe('cloudSync')

      cloud.remote.pull = async () => {
        throw failing('x', 'deadline-exceeded')
      }
      await session.syncNow()
      expect(session.getAccountState().error).toBe('network')
    })

    it('recovers on the next successful sync', async () => {
      await signedIn()
      const pull = cloud.remote.pull
      cloud.remote.pull = async () => {
        throw failing('boom')
      }
      await session.syncNow()
      cloud.remote.pull = pull

      await session.syncNow()

      expect(session.getAccountState()).toMatchObject({ status: 'idle', error: null })
    })

    it('pushes once for a burst of writes, and not at all for a key that does not travel', async () => {
      await signedIn()
      let pushes = 0
      const push = cloud.remote.push
      cloud.remote.push = async (...args) => {
        pushes += 1
        return push(...args)
      }

      backend.writePreferenceRow('failureLog', '[]')
      const { writePreference } = await import('../storage/preferences')
      writePreference('failureLog', [])
      writePreference('qadaProcessedThrough', '2026-01-01')
      await settle()
      expect(pushes).toBe(0)

      writePreference('hijriOffset', 1)
      writePreference('hijriOffset', 2)
      recordEvent(fajr)
      await settle(40)
      expect(pushes).toBe(1)
    })

    it('syncs when the app returns to the foreground, and does nothing when signed out', async () => {
      start()
      session.notifyForeground()
      await session.syncNow()
      expect(session.getAccountState().status).toBe('signed-out')

      await signedIn()
      recordEvent(fajr)
      session.notifyForeground()
      await settle()

      expect((await cloud.remote.pull('me', null)).events).toHaveLength(1)
    })

    it('stops everything when the session is torn down mid-debounce', async () => {
      await signedIn()
      recordEvent(fajr)
      stop()
      await settle(20)

      expect(session.getAccountState()).toMatchObject({ status: 'signed-out', account: null })
      expect((await cloud.remote.pull('me', null)).events).toHaveLength(0)
    })
  })

  describe('signing out', () => {
    it('does nothing when nobody is signed in', async () => {
      start()
      await session.signOut('remove')
      expect(session.getAccountState().status).toBe('signed-out')
    })

    it('keep: leaves this device its data and forgets the sign-in', async () => {
      await signedIn()
      recordEvent(fajr)

      await session.signOut('keep')

      expect(session.getAccountState().status).toBe('signed-out')
      expect(backend.readPreferenceRow('account')?.value).toBe('{"signedIn":false}')
      expect(allActions()).toHaveLength(1)
      expect(wiped).toBe(0)
    })

    it('stays signed in and says so when the auth service refuses to sign out', async () => {
      await signedIn()
      cloud.auth.signOut = async () => {
        throw failing('keychain locked')
      }

      await session.signOut('keep')

      expect(session.getAccountState()).toMatchObject({
        status: 'error',
        error: 'unknown',
        account: { uid: 'me' },
      })
      expect(recentFailures().at(-1)?.label).toBe('cloudSignOut')
    })

    it('keep is allowed even when the last sync failed; remove is not', async () => {
      await signedIn()
      cloud.remote.pull = async () => {
        throw failing('offline')
      }

      await session.signOut('remove')
      expect(session.getAccountState()).toMatchObject({ error: 'remove-blocked' })

      await session.signOut('keep')
      expect(session.getAccountState().status).toBe('signed-out')
    })
  })

  describe("an account that is not this device's", () => {
    const mismatch = async (): Promise<void> => {
      createLocalStore().writeMeta({ boundUid: 'someone-else', cursor: null, lastSyncedAt: null })
      recordEvent(fajr)
      start()
      await session.signIn('apple')
      await session.syncNow()
      expect(session.getAccountState().status).toBe('account-mismatch')
    }

    it('fresh: erases this device and takes the account as it is', async () => {
      await cloud.remote.push('me', {
        events: [
          { kind: 'prayer-performed', subject: 'asr', at: 5_000, logDay: 'd', deltaSeconds: null },
        ],
        preferences: [],
      })
      await mismatch()

      await session.resolveMismatch('fresh')

      expect(session.getAccountState()).toMatchObject({ status: 'idle', mismatchUid: undefined })
      expect(allActions().map((action) => action.subject)).toEqual(['asr'])
      expect(createLocalStore().readMeta().boundUid).toBe('me')
    })

    it('does nothing without an account', async () => {
      start()
      await session.resolveMismatch('merge')
      expect(session.getAccountState().status).toBe('signed-out')
    })
  })

  describe('deleting the account', () => {
    it('does nothing without an account', async () => {
      start()
      await session.deleteAccount('remove')
      expect(session.getAccountState().status).toBe('signed-out')
    })

    it('remove: erases the cloud copy, then this device, and tells the app', async () => {
      await signedIn()
      recordEvent(fajr)
      await session.syncNow()
      expect((await cloud.remote.pull('me', null)).events).toHaveLength(1)

      await session.deleteAccount('remove')

      expect(session.getAccountState()).toMatchObject({ status: 'signed-out', account: null })
      expect((await cloud.remote.pull('me', null)).events).toHaveLength(0)
      expect(allActions()).toEqual([])
      expect(wiped).toBe(1)
    })

    it('keep: leaves a local-only copy, unbound and ready to be pushed again', async () => {
      await signedIn()
      recordEvent(fajr)
      await session.syncNow()
      expect(createLocalStore().unsyncedEvents()).toEqual([])

      await session.deleteAccount('keep')

      expect(session.getAccountState().status).toBe('signed-out')
      expect(allActions()).toHaveLength(1)
      expect(createLocalStore().unsyncedEvents()).toHaveLength(1)
      expect(createLocalStore().readMeta()).toEqual({
        boundUid: null,
        cursor: null,
        lastSyncedAt: null,
      })
      expect(wiped).toBe(0)
    })

    it('treats closing the confirmation as changing your mind', async () => {
      await signedIn()
      cloud.auth.deleteAccount = async () => {
        throw failing('closed', 'auth/popup-closed-by-user')
      }

      await session.deleteAccount('remove')

      expect(session.getAccountState()).toMatchObject({
        status: 'idle',
        error: null,
        account: { uid: 'me' },
      })
    })

    it('reports any other failure and keeps the account', async () => {
      await signedIn()
      cloud.auth.deleteAccount = async () => {
        throw failing('server on fire')
      }

      await session.deleteAccount('remove')

      expect(session.getAccountState()).toMatchObject({
        status: 'error',
        error: 'unknown',
        account: { uid: 'me' },
      })
      expect(recentFailures().at(-1)?.label).toBe('cloudDeleteAccount')
    })
  })

  describe('linking', () => {
    it('does nothing when signed out', async () => {
      start()
      await session.linkProvider('google')
      expect(session.getAccountState().status).toBe('signed-out')
    })

    it('treats a closed link window as nothing happening', async () => {
      await signedIn()
      cloud.auth.link = async () => {
        throw failing('closed', 'ERR_CANCELED')
      }

      await session.linkProvider('google')

      expect(session.getAccountState()).toMatchObject({ status: 'idle', error: null })
    })

    it('reports another failure as auth', async () => {
      await signedIn()
      cloud.auth.link = async () => {
        throw failing('nope')
      }

      await session.linkProvider('google')

      expect(session.getAccountState()).toMatchObject({ status: 'error', error: 'auth' })
      expect(recentFailures().at(-1)?.label).toBe('cloudLink')
    })

    it('clears an earlier error once linking works', async () => {
      await signedIn()
      cloud.remote.pull = async () => {
        throw failing('offline')
      }
      await session.syncNow()
      expect(session.getAccountState().status).toBe('error')

      await session.linkProvider('google')

      expect(session.getAccountState()).toMatchObject({ status: 'idle', error: null })
    })

    it('cancelLink still lets go when the auth service will not sign out', async () => {
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
      expect(session.getAccountState().status).toBe('link-required')
      cloud.auth.signOut = async () => {
        throw failing('keychain locked')
      }

      await session.cancelLink()

      expect(session.getAccountState()).toMatchObject({ status: 'signed-out', link: undefined })
      expect(recentFailures().at(-1)?.label).toBe('cloudCancelLink')
    })

    it('cancelLink does nothing when there is nothing to cancel', async () => {
      await signedIn()
      await session.cancelLink()
      expect(session.getAccountState().status).toBe('idle')
    })

    it('signing in again while signed in settles back to idle when the sheet is closed', async () => {
      await signedIn()
      cloud.auth.signIn = async () => {
        throw failing('closed', 'cancelled')
      }

      await session.signIn('google')

      expect(session.getAccountState()).toMatchObject({ status: 'idle', error: null })
    })

    it('a failed sign-in while signed in is an error on the account, not a sign-out', async () => {
      await signedIn()
      cloud.auth.signIn = async () => {
        throw failing('x', 'auth/network-request-failed')
      }

      await session.signIn('google')

      expect(session.getAccountState()).toMatchObject({
        status: 'error',
        error: 'network',
        account: { uid: 'me' },
      })
    })
  })

  describe('the hook', () => {
    it('re-renders as the account changes', async () => {
      const { result } = renderHook(() => session.useAccount())
      expect(result.current.status).toBe('signed-out')
      start()

      await act(async () => {
        await session.signIn('apple')
        await session.syncNow()
      })

      expect(result.current).toMatchObject({ status: 'idle', account: { uid: 'me' } })
    })
  })
})
