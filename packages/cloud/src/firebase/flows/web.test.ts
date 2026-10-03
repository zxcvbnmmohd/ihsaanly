import { beforeEach, describe, expect, test } from 'bun:test'
import { callsTo, fake, resetFakes } from '../../../test/firebase-fakes'

const { createWebCloud, webFlow } = await import('./web')

const config = {
  apiKey: 'key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: '1:2:web:3',
}
const auth = { id: 'auth' } as never
const user = { uid: 'u1' } as never

beforeEach(resetFakes)

describe('webFlow', () => {
  test('sign-in opens a popup for Google or Apple', async () => {
    await webFlow.signIn(auth, 'google')
    await webFlow.signIn(auth, 'apple')
    const [google, apple] = callsTo('signInWithPopup').map(([, provider]) => provider) as {
      providerId?: string
    }[]
    expect(google?.providerId).toBe('google.com')
    expect(apple?.providerId).toBe('apple.com')
  })

  test('link opens a popup on the signed-in user', async () => {
    await webFlow.link(user, 'apple')
    const [[linked, provider]] = callsTo('linkWithPopup') as [[unknown, { providerId: string }]]
    expect(linked).toBe(user)
    expect(provider.providerId).toBe('apple.com')
  })

  test('the pending credential comes off the error, per provider', () => {
    const error = { code: 'auth/account-exists-with-different-credential' }
    expect(webFlow.pendingCredential(error, 'google')).toMatchObject({
      kind: 'google-from-error',
      error,
    })
    expect(webFlow.pendingCredential(error, 'apple')).toMatchObject({
      kind: 'apple-from-error',
      error,
    })
  })

  test('linkCredential links with the credential it is given', async () => {
    await webFlow.linkCredential(user, { id: 'c' } as never)
    expect(callsTo('linkWithCredential')).toEqual([[user, { id: 'c' }]])
  })

  test('every provider is available, and reauthenticate opens a popup', async () => {
    expect(await webFlow.available('apple')).toBe(true)
    expect(await webFlow.available('google')).toBe(true)
    await webFlow.reauthenticate(user, 'google')
    expect(callsTo('reauthenticateWithPopup')).toHaveLength(1)
    expect(webFlow.revoke).toBeUndefined()
  })
})

describe('createWebCloud', () => {
  test('wires auth and Firestore to one app, with no emulator by default', () => {
    createWebCloud(config)
    expect(fake.apps).toHaveLength(1)
    expect(callsTo('connectAuthEmulator')).toEqual([])
    expect(callsTo('connectFirestoreEmulator')).toEqual([])
    expect(callsTo('initializeFirestore')[0]?.[1]).toEqual({ localCache: { kind: 'memory' } })
  })

  test('points auth and Firestore at the emulators when a host is set', () => {
    createWebCloud({ ...config, emulatorHost: '127.0.0.1' })
    expect(callsTo('connectAuthEmulator').map(([, url]) => url)).toEqual(['http://127.0.0.1:9099'])
    expect(callsTo('connectFirestoreEmulator').map(([, host, port]) => [host, port])).toEqual([
      ['127.0.0.1', 8080],
    ])
    expect(fake.apps[0]?.options).not.toHaveProperty('emulatorHost')
  })

  test('does not connect the auth emulator twice', () => {
    createWebCloud({ ...config, emulatorHost: '127.0.0.1' })
    createWebCloud({ ...config, emulatorHost: '127.0.0.1' })
    expect(callsTo('connectAuthEmulator')).toHaveLength(1)
  })

  test('the auth service signs in through the popup flow', async () => {
    fake.user = {
      uid: 'u9',
      email: null,
      displayName: null,
      providerData: [{ providerId: 'google.com' }],
    }
    const cloud = createWebCloud(config)
    expect(await cloud.auth.signIn('google')).toMatchObject({ uid: 'u9', providers: ['google'] })
    expect(typeof cloud.remote.push).toBe('function')
    expect(typeof cloud.feedback.send).toBe('function')
  })
})
