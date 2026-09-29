// The shapes screens take that the host app owns. Structural on purpose: the
// app's own zod-inferred types satisfy them without ui importing the app.

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export type Gender = 'female' | 'male' | 'unspecified'

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable'

export interface HomeRegion {
  latitude: number
  longitude: number
  label: string
}

export interface EventSettings {
  detectHome: boolean
  home: HomeRegion | null
  manual: string[]
}

export interface MoreRow {
  href: string
  title: string
  detail: string | null
}

export interface MoreGroup {
  title: string
  rows: MoreRow[]
}

/**
 * What the diagnostics preview shows before a report is sent. The app derives
 * it from the full bundle.
 */
export interface DiagnosticsSummary {
  version: string
  device: string
  coordinates: { latitude: number; longitude: number } | null
  records: number
  settings: number
  /** Reminder permission, and how many are queued. */
  reminders: { permission: PermissionStatus; pending: number }
  /** How many recorded failures ride along, and when the last one was. */
  failures: { count: number; latest: string | null }
  hasError: boolean
}

/** Shows exactly what the bundle carries; the rounding happened when it was built. */
export function formatCoordinates(at: { latitude: number; longitude: number }): string {
  return `${at.latitude}, ${at.longitude}`
}

export type SignInProvider = 'apple' | 'google'

export type AccountStatus = 'signed-out' | 'syncing' | 'idle' | 'error' | 'account-mismatch'

export interface AccountIdentity {
  email: string | null
  displayName: string | null
  provider: SignInProvider
}

/** What the Account screen shows; `@ihsaanly/state`'s `useAccount()` satisfies it. */
export interface AccountView {
  status: AccountStatus
  account: AccountIdentity | null
  lastSyncedAt: number | null
  error: string | null
}
