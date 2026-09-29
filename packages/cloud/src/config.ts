// No Firebase import: apps read this at startup to decide whether the cloud
// exists at all, and an offline-only build must not pull the SDK to find out.
import type { FirebaseConfig } from './firebase/app'

/** The env names each app maps its own prefixed variables onto. */
export interface FirebaseEnv {
  apiKey?: string
  authDomain?: string
  projectId?: string
  appId?: string
  emulatorHost?: string
}

function present(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * The config, or null when any required value is missing — the build is then
 * local-only: no `startCloud`, no Account row, no Firebase in the bundle's
 * startup path.
 */
export function firebaseConfigFrom(env: FirebaseEnv): FirebaseConfig | null {
  const apiKey = present(env.apiKey)
  const authDomain = present(env.authDomain)
  const projectId = present(env.projectId)
  const appId = present(env.appId)
  if (!apiKey || !authDomain || !projectId || !appId) return null

  const emulatorHost = present(env.emulatorHost)
  return { apiKey, authDomain, projectId, appId, ...(emulatorHost ? { emulatorHost } : {}) }
}
