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
  provider: SignInProvider
}

export interface AuthService {
  current: () => Account | null
  /** Called once with the restored session (or null), then on every change. */
  onChange: (listener: (account: Account | null) => void) => Unsubscribe
  signIn: (provider: SignInProvider) => Promise<Account>
  signOut: () => Promise<void>
  /**
   * Re-authenticates, erases the account's cloud data through `erase`, then
   * deletes the account itself — in that order, because once the account is
   * gone the rules no longer let anyone delete its data.
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

// --- remote config --------------------------------------------------------

export interface RemoteConfigService<T> {
  /** Last fetched values, or the defaults until a fetch succeeds. */
  get: () => T
  refresh: () => Promise<void>
}

// --- the bundle an app wires up -------------------------------------------

export interface Cloud {
  auth: AuthService
  remote: SyncRemote
}
