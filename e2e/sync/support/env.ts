// Shared constants for the sync suite: the emulator project, its ports, and
// where the emulator-configured companion build lives (outside apps/companion/dist,
// so the regular e2e build is never clobbered).
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const PROJECT = 'demo-ihsaanly'
export const HOST = '127.0.0.1'
export const AUTH_PORT = 9099
export const FIRESTORE_PORT = 8080
export const COMPANION_PORT = 4321

export const AUTH_URL = `http://${HOST}:${AUTH_PORT}`
export const FIRESTORE_URL = `http://${HOST}:${FIRESTORE_PORT}`

/** The companion built against the emulators (VITE_FIREBASE_EMULATOR_HOST). */
export const SYNC_DIST = join(tmpdir(), 'ihsaanly-e2e-sync', 'companion')

/** Build-time env: the same names apps/companion/src/cloud.ts reads. */
export const COMPANION_ENV = {
  VITE_FIREBASE_API_KEY: 'demo',
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_PROJECT_ID: PROJECT,
  VITE_FIREBASE_APP_ID: 'demo',
  VITE_FIREBASE_EMULATOR_HOST: HOST,
  VITE_APP_ENV: 'production',
}
