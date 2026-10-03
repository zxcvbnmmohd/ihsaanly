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

/** What the feedback is about. */
export type FeedbackKind = 'bug' | 'idea' | 'other'

/** `queued` is saved on this device and will go when the device is online. */
export type FeedbackStatus = 'idle' | 'sending' | 'queued' | 'sent' | 'error'

/**
 * A code, not a message: the Feedback screen owns the sentence, in the reader's language.
 * With `queued`: `network` or `signed-out` (it goes later). With `error`: `invalid` (nothing
 * was queued), or `rate-limited` / `unknown` (still queued; "Try again" sends it).
 */
export type FeedbackErrorCode = 'rate-limited' | 'network' | 'signed-out' | 'invalid' | 'unknown'

/** The longest message the cloud accepts. */
export const FEEDBACK_MESSAGE_MAX = 5000

/**
 * A per-device opt-in the host can offer, such as announcements or crash
 * reports. A host that cannot provide the feature leaves the prop out, and the
 * screen shows no switch for it.
 */
export interface OptIn {
  on: boolean
  onChange: (on: boolean) => void
}

/**
 * How far a Today row has got when it is done in parts: a counted dhikr
 * (`count`, 12 of 33) or an item with several parts (`parts`, 4 of 11).
 */
export interface EntryProgress {
  kind: 'count' | 'parts'
  value: number
  total: number
}

/**
 * The circle at the start of a Today row. `progress` is null for an item done
 * in one go; a row with no mark at all (tomorrow, later) has no circle.
 */
export interface EntryMark {
  done: boolean
  progress: EntryProgress | null
}

/** The counter sheet for a counted dhikr. It closes itself at `target`. */
export interface CountPanel {
  kind: 'count'
  itemId: string
  title: string
  count: number
  target: number
}

export interface PanelPart {
  id: string
  title: string
  done: boolean
}

/** The checklist sheet for an item done in parts. */
export interface PartsPanel {
  kind: 'parts'
  itemId: string
  title: string
  parts: PanelPart[]
}

export type TodayPanel = CountPanel | PartsPanel

/** The three first-run coach marks on Today: a prayer circle, a sunnah circle, a card. */
export type TourStep = 0 | 1 | 2

export const TOUR_STEPS = 3

export interface TodayTour {
  step: TourStep
  /** Next, or "Got it" on the last step: the route advances or ends the tour. */
  onNext: () => void
  /** Skip, or Escape: the route ends the tour. */
  onSkip: () => void
}

/**
 * The snackbar after something was marked done. `id` changes with each new
 * mark, which restarts the timer; the same mark re-rendered does not.
 */
export interface TodayUndo {
  id: string
  title: string
  onUndo: () => void
}

/** How long the undo bar stays before `onDismissUndo`. */
export const UNDO_MS = 5000

/** Shown on Today while paused, once the check-in reminder is due. */
export interface TodayCheckIn {
  onResume: () => void
  onNotYet: () => void
}

/** The "Remind me in about N days" range on Tracking, and where it starts. */
export const CHECK_IN_DAYS = { min: 3, max: 10, initial: 7 } as const
