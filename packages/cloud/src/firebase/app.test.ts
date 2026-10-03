import { beforeEach, describe, expect, test } from 'bun:test'
import { callsTo, fake, resetFakes } from '../../test/firebase-fakes'

const { AUTH_EMULATOR_PORT, firebaseApp, firestore } = await import('./app')

const config = {
  apiKey: 'key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: '1:2:web:3',
  emulatorHost: '127.0.0.1',
}

beforeEach(resetFakes)

describe('firebaseApp', () => {
  test('initializes once, without the emulator host the SDK does not know', () => {
    const app = firebaseApp(config)
    expect(callsTo('initializeApp')).toEqual([
      [
        {
          apiKey: 'key',
          authDomain: 'demo.firebaseapp.com',
          projectId: 'demo',
          appId: '1:2:web:3',
        },
      ],
    ])
    expect(firebaseApp(config)).toBe(app)
    expect(callsTo('initializeApp')).toHaveLength(1)
  })

  test('the auth emulator port is the emulator suite default', () => {
    expect(AUTH_EMULATOR_PORT).toBe(9099)
  })
})

describe('firestore', () => {
  test('uses a memory cache, no long-polling detection off native, no emulator unless asked', () => {
    const app = firebaseApp(config)
    firestore(app, { native: false })
    expect(callsTo('initializeFirestore')).toEqual([[app, { localCache: { kind: 'memory' } }]])
    expect(callsTo('connectFirestoreEmulator')).toEqual([])
  })

  test('native turns on long-polling auto-detection', () => {
    const app = firebaseApp(config)
    firestore(app, { native: true })
    expect(callsTo('initializeFirestore')[0]?.[1]).toEqual({
      localCache: { kind: 'memory' },
      experimentalAutoDetectLongPolling: true,
    })
  })

  test('connects the emulator on port 8080 when a host is given', () => {
    const app = firebaseApp(config)
    const db = firestore(app, { native: false, emulatorHost: '127.0.0.1' })
    expect(callsTo('connectFirestoreEmulator')).toEqual([[db, '127.0.0.1', 8080]])
  })

  test('after a hot reload it returns the instance that exists, without reconnecting', () => {
    const app = firebaseApp(config)
    firestore(app, { native: true, emulatorHost: '127.0.0.1' })
    const again = firestore(app, { native: true, emulatorHost: '127.0.0.1' })
    expect(callsTo('getFirestore')).toEqual([[app]])
    expect(again).toMatchObject({ app })
    expect(callsTo('connectFirestoreEmulator')).toHaveLength(1)
    expect(fake.firestores.size).toBe(1)
  })
})
