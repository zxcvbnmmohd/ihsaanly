import { beforeEach, describe, expect, test } from 'bun:test'
import { callsTo, fake, resetFakes } from '../../../test/firebase-fakes'

const { createExtensionCloud, extensionFlow } = await import('./extension')

const config = {
  apiKey: 'key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: '1:2:web:3',
}
const auth = { id: 'auth' } as never
const user = { uid: 'u1' } as never
const flow = (): ReturnType<typeof extensionFlow> =>
  extensionFlow({ getGoogleAccessToken: async () => 'access-token' })
const googleCredential = { kind: 'google-credential', idToken: null, accessToken: 'access-token' }

beforeEach(resetFakes)

describe('extensionFlow', () => {
  test('Google signs in with the access token chrome.identity gave', async () => {
    await flow().signIn(auth, 'google')
    expect(callsTo('signInWithCredential', 'auth/web-extension')).toEqual([
      [auth, googleCredential],
    ])
  })

  test('only ever loads the extension-safe entry of firebase/auth', async () => {
    const extension = flow()
    await extension.signIn(auth, 'google')
    await extension.link(user, 'google')
    await extension.reauthenticate(user, 'google')
    extension.linkCredential(user, googleCredential as never)
    expect(fake.calls.filter((call) => call.entry === 'auth')).toEqual([])
  })

  test('Apple is unsupported for every operation, and nothing is requested', async () => {
    let tokenRequests = 0
    const extension = extensionFlow({
      getGoogleAccessToken: async () => {
        tokenRequests += 1
        return 'access-token'
      },
    })
    await expect(extension.signIn(auth, 'apple')).rejects.toThrow('apple-unsupported')
    await expect(extension.link(user, 'apple')).rejects.toThrow('apple-unsupported')
    await expect(extension.reauthenticate(user, 'apple')).rejects.toThrow('apple-unsupported')
    expect(tokenRequests).toBe(0)
    expect(await extension.available('apple')).toBe(false)
    expect(await extension.available('google')).toBe(true)
  })

  test('the pending credential is the one the last sign-in built', async () => {
    const extension = flow()
    expect(extension.pendingCredential(null, 'google')).toBeNull()
    await extension.signIn(auth, 'google')
    expect(extension.pendingCredential(null, 'google')).toEqual(googleCredential as never)
  })

  test('a token failure clears the pending credential', async () => {
    let fail = false
    const extension = extensionFlow({
      getGoogleAccessToken: async () => {
        if (fail) throw new Error('no token')
        return 'access-token'
      },
    })
    await extension.signIn(auth, 'google')
    fail = true
    await expect(extension.signIn(auth, 'google')).rejects.toThrow('no token')
    expect(extension.pendingCredential(null, 'google')).toBeNull()
  })

  test('link, linkCredential and reauthenticate go through the credential APIs', async () => {
    const extension = flow()
    await extension.link(user, 'google')
    await extension.linkCredential(user, { id: 'c' } as never)
    await extension.reauthenticate(user, 'google')
    expect(callsTo('linkWithCredential')).toEqual([
      [user, googleCredential],
      [user, { id: 'c' }],
    ])
    expect(callsTo('reauthenticateWithCredential')).toEqual([[user, googleCredential]])
  })
})

describe('createExtensionCloud', () => {
  const deps = { getGoogleAccessToken: async () => 'access-token' }

  test('persists the session in IndexedDB and uses plain Firestore transport', () => {
    createExtensionCloud(config, deps)
    expect(callsTo('initializeAuth', 'auth/web-extension')[0]?.[1]).toEqual({
      persistence: { type: 'indexeddb' },
    })
    expect(callsTo('initializeFirestore')[0]?.[1]).toEqual({ localCache: { kind: 'memory' } })
    expect(callsTo('connectAuthEmulator')).toEqual([])
  })

  test('connects both emulators when a host is set', () => {
    createExtensionCloud({ ...config, emulatorHost: '127.0.0.1' }, deps)
    expect(callsTo('connectAuthEmulator').map(([, url]) => url)).toEqual(['http://127.0.0.1:9099'])
    expect(callsTo('connectFirestoreEmulator')).toHaveLength(1)
  })

  test('on a second load it falls back to the auth instance that exists', () => {
    createExtensionCloud({ ...config, emulatorHost: '127.0.0.1' }, deps)
    const cloud = createExtensionCloud({ ...config, emulatorHost: '127.0.0.1' }, deps)
    expect(callsTo('getAuth', 'auth/web-extension')).toHaveLength(1)
    expect(callsTo('connectAuthEmulator')).toHaveLength(1)
    expect(typeof cloud.remote.erase).toBe('function')
    expect(typeof cloud.feedback.send).toBe('function')
  })
})
