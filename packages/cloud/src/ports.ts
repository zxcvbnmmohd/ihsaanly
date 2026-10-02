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
  preferences: SyncPreference[]
  /** Opaque to the engine; hand it back on the next pull. */
  cursor: string | null
}

export interface SyncRemote {
  pull: (uid: string, cursor: string | null) => Promise<RemoteChanges>
  push: (
    uid: string,
    changes: { events: SyncEvent[]; preferences: SyncPreference[] },
  ) => Promise<void>
  /** Everything stored for `uid`. Account deletion only. */
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
  readMeta: () => SyncMeta
  writeMeta: (meta: SyncMeta) => void
}

export interface SyncMeta {
  /** The account this device's data was last merged into. */
  boundUid: string | null
  cursor: string | null
  lastSyncedAt: number | null
}

// --- the bundle an app wires up -------------------------------------------

export interface Cloud {
  auth: AuthService
  remote: SyncRemote
}
