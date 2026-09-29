import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  messagingSenderId?: string
  storageBucket?: string
  /** e.g. '127.0.0.1': points auth (9099) and Firestore (8080) at the local emulators. */
  emulatorHost?: string
}

export const AUTH_EMULATOR_PORT = 9099
const FIRESTORE_EMULATOR_PORT = 8080

/** Initializes once; a hot reload re-runs this module but the app survives it. */
export function firebaseApp(config: FirebaseConfig): FirebaseApp {
  if (getApps().length > 0) return getApp()
  const { emulatorHost: _emulatorHost, ...options } = config
  return initializeApp(options)
}

/**
 * ponytail: memory cache everywhere. The device's own SQLite / localStorage is
 * the source of truth and the engine pulls by cursor, so Firestore's offline
 * persistence would only be a second copy to keep consistent.
 */
export function firestore(
  app: FirebaseApp,
  options: { native: boolean; emulatorHost?: string },
): Firestore {
  let db: Firestore
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      // Already the SDK default since 9.22; stated so RN's fetch-based
      // transport never depends on that default staying put.
      ...(options.native ? { experimentalAutoDetectLongPolling: true } : {}),
    })
  } catch {
    // Throws once the instance exists, which after a hot reload it does —
    // already configured and emulator-connected by the first run.
    return getFirestore(app)
  }
  if (options.emulatorHost)
    connectFirestoreEmulator(db, options.emulatorHost, FIRESTORE_EMULATOR_PORT)
  return db
}
