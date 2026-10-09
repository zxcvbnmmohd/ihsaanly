// The seams. Everything outside `firebase/` talks only to these, so moving to
// Supabase, Amplify or a Postgres API is a new folder of adapters plus the one
// line in `index.ts` that picks them — the engine, the stores and the screens
// never change.

export type Unsubscribe = () => void

// --- auth ---------------------------------------------------------------

export type SignInProvider = 'apple' | 'google'

export interface Account {
  uid: string
  email: string | null
  displayName: string | null
  /** The first of `providers` (Apple before Google); what "Signed in with …" names. */
  provider: SignInProvider
  /** Every sign-in method linked to this account. Any of them opens the same uid. */
  providers: SignInProvider[]
}

/**
 * `signIn` found an account for this email that uses the other provider. The
 * person signs in with `existing` next, and `attempted` is linked to it then,
 * so both open the same account from then on. `email` is null when the
 * provider withheld it.
 */
export class LinkRequiredError extends Error {
  readonly code = 'link-required'
  readonly existing: SignInProvider
  readonly attempted: SignInProvider
  readonly email: string | null

  constructor(existing: SignInProvider, attempted: SignInProvider, email: string | null) {
    super(`This email already has an account that signs in with ${existing}`)
    this.name = 'LinkRequiredError'
    this.existing = existing
    this.attempted = attempted
    this.email = email
  }
}

/**
 * `link` was given an Apple or Google identity that already opens a different
 * account. Nothing is merged: two accounts stay two accounts.
 */
export class LinkConflictError extends Error {
  readonly code = 'link-conflict'
  readonly provider: SignInProvider

  constructor(provider: SignInProvider) {
    super(`That ${provider} identity already belongs to a different account`)
    this.name = 'LinkConflictError'
    this.provider = provider
  }
}

/**
 * Deleting needs a fresh sign-in, and none of the account's linked providers
 * can sign in on this platform (an Apple-only account in the extension).
 */
export class ReauthUnavailableError extends Error {
  readonly code = 'reauth-unavailable'
  readonly linked: SignInProvider[]

  constructor(linked: SignInProvider[]) {
    super('None of this account’s sign-in methods is available here')
    this.name = 'ReauthUnavailableError'
    this.linked = linked
  }
}

/** The other of the two providers we offer. */
export function otherProvider(provider: SignInProvider): SignInProvider {
  return provider === 'apple' ? 'google' : 'apple'
}

export interface AuthService {
  current: () => Account | null
  /** Called once with the restored session (or null), then on every change. */
  onChange: (listener: (account: Account | null) => void) => Unsubscribe
  /**
   * Rejects with `LinkRequiredError` when the email already has an account on
   * the other provider; the next successful `signIn` with that provider links
   * this one to it.
   */
  signIn: (provider: SignInProvider) => Promise<Account>
  /**
   * Adds another sign-in method to the signed-in account. Rejects with
   * `LinkConflictError` when that identity already opens a different account.
   */
  link: (provider: SignInProvider) => Promise<Account>
  /** Also forgets a sign-in waiting to be linked. */
  signOut: () => Promise<void>
  /**
   * Re-authenticates, erases the account's cloud data through `erase`, then
   * deletes the account itself — in that order, because once the account is
   * gone the rules no longer let anyone delete its data. Rejects with
   * `ReauthUnavailableError` when no linked provider can sign in here.
   */
  deleteAccount: (erase: (uid: string) => Promise<void>) => Promise<void>
}

// --- sync ---------------------------------------------------------------

/** One fact from the append-only log. Identity is `kind|subject|at`. */
export interface SyncEvent {
  kind: string
  subject: string
  at: number
  logDay: string
  deltaSeconds: number | null
}

/** A preference as JSON text, stamped with when it was last set (ms). */
export interface SyncPreference {
  key: string
  value: string
  updatedAt: number
}

export interface RemoteChanges {
  events: SyncEvent[]
  /**
   * Only when the account's preferences changed since the cursor (then all of
   * them); an empty list means "unchanged", not "none".
   */
  preferences: SyncPreference[]
  /** Opaque to the engine; hand it back on the next pull. */
  cursor: string | null
}

export interface PushChanges {
  events: SyncEvent[]
  /** Only the keys that changed; the rest stay as they are remotely. */
  preferences: SyncPreference[]
  /**
   * Keys this device dropped since it last synced them (finished item
   * progress); deleted remotely. Absent means none.
   */
  removedPreferences?: string[]
  /**
   * Also write the account's profile (created time, schema version). The
   * engine asks once per device and account, so later syncs read nothing to
   * find out whether it exists.
   */
  profile?: boolean
}

export interface SyncRemote {
  pull: (uid: string, cursor: string | null) => Promise<RemoteChanges>
  push: (uid: string, changes: PushChanges) => Promise<void>
  /**
   * Live changes while an app is open: `onChanges` gets what changed after
   * `cursor`, in the same shape as `pull` (preferences all of them, only when
   * they changed), each time with the cursor to resume from. This device's
   * own pushes come back too. `onError` means the listener has stopped.
   * Optional: a remote without a push channel is synced by `pull` alone.
   */
  watch?: (
    uid: string,
    cursor: string | null,
    onChanges: (changes: RemoteChanges) => void,
    onError?: (error: unknown) => void,
  ) => Unsubscribe
  /** Everything stored for `uid`, old layouts included. Account deletion only. */
  erase: (uid: string) => Promise<void>
}

/** The device side, implemented by `@ihsaanly/state` over its storage seam. */
export interface LocalStore {
  /** Events not yet pushed, each with the local id `markSynced` takes back. */
  unsyncedEvents: () => (SyncEvent & { id: number })[]
  markSynced: (ids: number[]) => void
  /** Every event back to unsynced — merging this device into a different account. */
  resetSynced: () => void
  /** Inserts, skipping any already present; returns how many were new. */
  insertRemoteEvents: (events: SyncEvent[]) => number
  /** Only the keys that sync; the store owns that allowlist. */
  preferences: () => SyncPreference[]
  /** Writes these as given (keeping their timestamps) and refreshes readers. */
  applyPreferences: (preferences: SyncPreference[]) => void
  /**
   * Deletes these keys (another device dropped them) and refreshes readers.
   * The store decides which keys may go; without it nothing is deleted.
   */
  removePreferences?: (keys: string[]) => void
  /**
   * For a key both sides changed since they last agreed: the value that keeps
   * both changes, or null for newest-wins. Must be commutative, so two devices
   * merging the same pair agree. Without it every key is newest-wins.
   */
  mergePreference?: (ours: SyncPreference, theirs: SyncPreference) => string | null
  readMeta: () => SyncMeta
  writeMeta: (meta: SyncMeta) => void
}

export interface SyncMeta {
  /**
   * The layout this device last synced in. Older than `SYNC_META_VERSION`
   * (engine.ts), the next sync pushes everything again into the current one.
   */
  version: number
  /** The account this device's data was last merged into. */
  boundUid: string | null
  cursor: string | null
  lastSyncedAt: number | null
  /** Whether this device has written `boundUid`'s profile document. */
  profileWritten: boolean
  /**
   * Each preference's timestamp as last pushed or pulled. A key whose local
   * timestamp differs is pushed; the rest are not, because a pull only sees
   * preferences when they changed remotely.
   */
  syncedPreferences: Record<string, number>
}

// --- feedback -----------------------------------------------------------

export type FeedbackKind = 'bug' | 'idea' | 'other'

export type FeedbackSurface = 'ios' | 'android' | 'web' | 'extension'

/** The limits `firestore.rules` enforces; the screen shows the same ones. */
export const FEEDBACK_MESSAGE_MAX = 5000
export const FEEDBACK_EMAIL_MAX = 254
/** One send per account per minute, checked by the rules against `feedbackLimits/{uid}`. */
export const FEEDBACK_INTERVAL_MS = 60_000

/** Which app sent it. Every field is short: the rules cap each one. */
export interface FeedbackApp {
  surface: FeedbackSurface
  version: string
  locale: string
  os: string
}

/**
 * The diagnostic report as it travels with feedback: what helps reproduce a
 * bug, and nothing of the user's practice itself. No events, no preference
 * values — only counts and key names. Coordinates are rounded to ~1 km, the
 * same as the synced place.
 */
export interface FeedbackDiagnostics {
  generatedAt: string
  app: { version: string; platform: string; osVersion: string; device: string }
  locale: string
  timeZone: string
  utcOffsetMinutes: number
  daylightSaving: boolean
  coordinates: { latitude: number; longitude: number } | null
  notifications: {
    windows: boolean
    lookAhead: boolean
    prayers: boolean
    quietHours: { from: number; to: number } | null
    maxPerDay: number
    /** How many items override their category, not which. */
    perItemOverrides: number
  }
  reminders: { permission: string; pending: number }
  lastStorageError: string | null
  /** At most 20, newest last, messages truncated, no stacks. */
  failures: { at: string; label: string; message: string }[]
  data: {
    /** Events per kind. */
    eventCounts: Record<string, number>
    /** Distinct log days with at least one event. */
    days: number
    /** How many preferences are set: never their names or values. */
    preferences: number
    /** How many items have progress (`progress:<itemId>`), not which. */
    trackedItems: number
  }
}

export interface FeedbackDraft {
  kind: FeedbackKind
  message: string
  contactEmail: string | null
  app: FeedbackApp
  diagnostics: FeedbackDiagnostics | null
}

/** The account sent feedback less than `FEEDBACK_INTERVAL_MS` ago. Try again later. */
export class FeedbackRateLimitedError extends Error {
  readonly code = 'rate-limited'

  constructor() {
    super('Feedback was sent from this account less than a minute ago')
    this.name = 'FeedbackRateLimitedError'
  }
}

export interface FeedbackService {
  /** Rejects with `FeedbackRateLimitedError` inside the one-minute window. */
  send: (uid: string, draft: FeedbackDraft) => Promise<void>
}

// --- the bundle an app wires up -------------------------------------------

export interface Cloud {
  auth: AuthService
  remote: SyncRemote
  feedback: FeedbackService
}
