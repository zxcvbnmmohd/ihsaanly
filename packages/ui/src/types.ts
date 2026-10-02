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

export type AccountStatus =
  | 'signed-out'
  | 'syncing'
  | 'idle'
  | 'error'
  | 'account-mismatch'
  | 'link-required'

export interface AccountIdentity {
  email: string | null
  displayName: string | null
  provider: SignInProvider
  /** Every sign-in method linked to the account. */
  providers: SignInProvider[]
}

/** A code, not a message: the Account screen owns the sentence, in the reader's language. */
export type AccountErrorCode =
  | 'network'
  | 'auth'
  | 'sync'
  | 'unknown'
  | 'remove-blocked'
  | 'link-conflict'
  | 'reauth-unavailable'

/** The email already has an account on `existing`; signing in with it links `attempted`. */
export interface AccountLinkPrompt {
  existing: SignInProvider
  attempted: SignInProvider
}

/**
 * Where signing in from onboarding has got to. `restoring` while the sign-in
 * and its first sync run; then `restored` if the account's synced setup
 * finished onboarding, or `needs-setup` if it never did (a new account).
 * `idle` before anything is signed in, and whenever the Account screen's own
 * states (errors, a mismatch, a link prompt) are the answer instead.
 */
export type RestoreOutcome = 'idle' | 'restoring' | 'restored' | 'needs-setup'

/** What the Account screen shows; `@ihsaanly/state`'s `useAccount()` satisfies it. */
export interface AccountView {
  status: AccountStatus
  account: AccountIdentity | null
  lastSyncedAt: number | null
  error: AccountErrorCode | null
  /** Set with `link-required`, and kept while that sign-in runs. */
  link?: AccountLinkPrompt | undefined
}
