import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { callsTo, fake, resetFakes } from '../../../test/firebase-fakes'

const { createNativeCloud, nativeFlow } = await import('./native')

const config = {
  apiKey: 'key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: '1:2:ios:3',
}
const storage = { getItem: async () => null } as never
const auth = { id: 'auth' } as never
const user = { uid: 'u1' } as never

function deps(overrides: Record<string, unknown> = {}): Parameters<typeof nativeFlow>[0] {
  return {
    storage,
    appleIdToken: mock(async () => ({ idToken: 'apple-id', rawNonce: 'nonce' })),
    googleIdToken: mock(async () => 'google-id'),
    ...overrides,
  } as never
}

beforeEach(resetFakes)

describe('nativeFlow', () => {
  test('Google signs in with an ID token credential', async () => {
    const flow = nativeFlow(deps())
    await flow.signIn(auth, 'google')
    expect(callsTo('signInWithCredential')).toEqual([
      [auth, { kind: 'google-credential', idToken: 'google-id', accessToken: undefined }],
    ])
  })

  test('Apple signs in with an ID token and its nonce', async () => {
    const flow = nativeFlow(deps())
    await flow.signIn(auth, 'apple')
    expect(callsTo('signInWithCredential')).toEqual([
      [auth, { kind: 'oauth-credential', id: 'apple.com', idToken: 'apple-id', rawNonce: 'nonce' }],
    ])
  })

  test('the credential the last sign-in built is the pending one', async () => {
    const flow = nativeFlow(deps())
    expect(flow.pendingCredential(null, 'google')).toBeNull()
    await flow.signIn(auth, 'google')
    expect(flow.pendingCredential(null, 'google')).toMatchObject({ kind: 'google-credential' })
  })

  test('a sign-in whose token fails leaves no stale pending credential', async () => {
    const flow = nativeFlow(deps())
    await flow.signIn(auth, 'google')
    const failing = nativeFlow(
      deps({ googleIdToken: async () => Promise.reject(new Error('cancelled')) }),
    )
    await expect(failing.signIn(auth, 'google')).rejects.toThrow('cancelled')
    expect(failing.pendingCredential(null, 'google')).toBeNull()
  })

  test('link and reauthenticate use a fresh credential for the provider', async () => {
    const flow = nativeFlow(deps())
    await flow.link(user, 'apple')
    await flow.reauthenticate(user, 'google')
    expect(callsTo('linkWithCredential')[0]?.[1]).toMatchObject({ id: 'apple.com' })
    expect(callsTo('reauthenticateWithCredential')[0]?.[1]).toMatchObject({
      kind: 'google-credential',
    })
  })

  test('linkCredential links the credential it is given', async () => {
    await nativeFlow(deps()).linkCredential(user, { id: 'c' } as never)
    expect(callsTo('linkWithCredential')).toEqual([[user, { id: 'c' }]])
  })

  test('Google is always available; Apple defers to the device, defaulting to available', async () => {
    expect(await nativeFlow(deps({ appleAvailable: async () => false })).available('google')).toBe(
      true,
    )
    expect(await nativeFlow(deps()).available('apple')).toBe(true)
    expect(await nativeFlow(deps({ appleAvailable: async () => false })).available('apple')).toBe(
      false,
    )
    expect(await nativeFlow(deps({ appleAvailable: async () => true })).available('apple')).toBe(
      true,
    )
  })
})

describe('createNativeCloud', () => {
  test('keeps the session in the supplied storage and polls Firestore over long-polling', () => {
    createNativeCloud(config, deps())
    expect(callsTo('initializeAuth')[0]?.[1]).toEqual({
      persistence: { type: 'react-native', storage },
    })
    expect(callsTo('initializeFirestore')[0]?.[1]).toEqual({
      localCache: { kind: 'memory' },
      experimentalAutoDetectLongPolling: true,
    })
    expect(callsTo('connectAuthEmulator')).toEqual([])
  })

  test('connects both emulators when a host is set', () => {
    createNativeCloud({ ...config, emulatorHost: '10.0.2.2' }, deps())
    expect(callsTo('connectAuthEmulator').map(([, url]) => url)).toEqual(['http://10.0.2.2:9099'])
    expect(callsTo('connectFirestoreEmulator').map(([, host]) => host)).toEqual(['10.0.2.2'])
  })

  test('after a Fast Refresh it reuses the existing auth instead of failing', () => {
    createNativeCloud({ ...config, emulatorHost: '10.0.2.2' }, deps())
    const cloud = createNativeCloud({ ...config, emulatorHost: '10.0.2.2' }, deps())
    expect(callsTo('initializeAuth')).toHaveLength(2)
    expect(callsTo('getAuth')).toHaveLength(1)
    expect(callsTo('connectAuthEmulator')).toHaveLength(1)
    expect(fake.auths.size).toBe(1)
    expect(typeof cloud.auth.signIn).toBe('function')
    expect(typeof cloud.feedback.send).toBe('function')
  })
})
