import { afterAll, beforeEach, expect, it, mock, setSystemTime } from 'bun:test'
import type { FirebaseConfig } from '@ihsaanly/cloud/firebase/app'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'

const configs: FirebaseConfig[] = []
let remote = createMemorySyncRemote()
mock.module('@ihsaanly/cloud/firebase/flows/web', () => ({
  createWebCloud: (config: FirebaseConfig) => {
    configs.push(config)
    return {
      auth: createMemoryAuth({ uid: 'me' }),
      remote,
      feedback: createMemoryFeedback(),
    }
  },
}))

const session = await import('@ihsaanly/state/cloud/session')

// Leaves the shared session as it found it: signed out, no loader, no timers.
afterAll(async () => {
  await session.signOut('keep')
  session.startCloud(() => Promise.reject(new Error('stopped')))()
})

beforeEach(() => {
  configs.length = 0
  remote = createMemorySyncRemote()
  // Whatever loader an earlier test file (main.tsx starts sync) left behind.
  session.startCloud(() => Promise.reject(new Error('stopped')))()
})

it('is enabled by the four required VITE_FIREBASE_* values (set by test/preload.ts)', async () => {
  expect((await import('./cloud')).cloudEnabled).toBe(true)
})

it('is local-only without a config: nothing started', async () => {
  const cloud = await import('./cloud')
  cloud.startCompanionCloud(null)
  await session.signIn('google')
  expect(configs).toEqual([])
  expect(session.getAccountState().status).toBe('signed-out')
})

it('starts sync with the web flow, and a wipe reloads the page', async () => {
  const cloud = await import('./cloud')
  const firebase = {
    apiKey: 'key',
    authDomain: 'app.firebaseapp.com',
    projectId: 'project',
    appId: 'app',
    emulatorHost: 'localhost:9099',
  }

  const reload = mock(() => {})
  const original = window.location.reload
  Object.defineProperty(window.location, 'reload', { configurable: true, value: reload })
  try {
    cloud.startCompanionCloud(firebase)
    await session.signIn('google')
    expect(configs).toEqual([firebase])
    expect(session.getAccountState().account?.uid).toBe('me')

    await session.signOut('remove')
    expect(reload).toHaveBeenCalledTimes(1)
  } finally {
    Object.defineProperty(window.location, 'reload', { configurable: true, value: original })
  }
})

it('stops listening when hidden, and syncs and listens again when visible', async () => {
  const cloud = await import('./cloud')
  cloud.startCompanionCloud({ apiKey: 'key', authDomain: 'a', projectId: 'p', appId: 'app' })
  await session.signIn('google')
  await session.syncNow()
  const before = session.getAccountState().lastSyncedAt
  expect(remote.watchers()).toBe(1)

  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  const setVisibility = (value: string): void => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  }
  setVisibility('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(session.getAccountState().lastSyncedAt).toBe(before)
  expect(remote.watchers()).toBe(0)

  // Past the foreground throttle (session.ts): a sync a moment ago is not repeated.
  setSystemTime(new Date(Date.now() + session.FOREGROUND_SYNC_INTERVAL_MS))
  setVisibility('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(session.getAccountState().lastSyncedAt).not.toBe(before)
  expect(remote.watchers()).toBe(1)
  setSystemTime()
  if (visibility) Object.defineProperty(document, 'visibilityState', visibility)
})
