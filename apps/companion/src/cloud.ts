// Optional cloud sync. Without the VITE_FIREBASE_* values the build is
// local-only: no startCloud, no Account row. Firebase itself is only ever
// reached through the dynamic import below, so it stays a separate chunk.
import { firebaseConfigFrom } from '@ihsaanly/cloud/config'
import type { FirebaseConfig } from '@ihsaanly/cloud/firebase/app'
import { notifyBackground, notifyForeground, startCloud } from '@ihsaanly/state/cloud/session'

const config = firebaseConfigFrom({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
})

export const cloudEnabled = config !== null

/** Wires sync up once at launch; a no-op in a local-only build. */
export function startCompanionCloud(firebase: FirebaseConfig | null = config): void {
  if (!firebase) return
  startCloud(
    () => import('@ihsaanly/cloud/firebase/flows/web').then((m) => m.createWebCloud(firebase)),
    // Same as the Data screen after its own wipe: in-memory state is rebuilt from scratch.
    { onWiped: () => window.location.reload() },
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') notifyForeground()
    else notifyBackground()
  })
}
