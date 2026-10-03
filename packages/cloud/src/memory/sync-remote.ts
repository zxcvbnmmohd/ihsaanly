import { SYNC_META_VERSION } from '../engine'
import type { RemoteChanges, SyncEvent, SyncPreference, SyncRemote } from '../ports'

interface Account {
  /** Insertion order is the change order; `seq` is what the cursor counts. */
  events: Map<string, { event: SyncEvent; seq: number }>
  preferences: Map<string, SyncPreference>
  /** The `seq` of the last preference write; a pull after it sees them all. */
  preferencesSeq: number
  profile: { schemaVersion: number } | null
  seq: number
}

const identity = (event: SyncEvent): string => `${event.at}|${event.kind}|${event.subject}`

interface Watcher {
  uid: string
  cursor: string | null
  onChanges: (changes: RemoteChanges) => void
}

export interface MemorySyncRemote extends SyncRemote {
  watch: NonNullable<SyncRemote['watch']>
  /** Test helper: the account's profile, or null before the first push writes it. */
  profile: (uid: string) => { schemaVersion: number } | null
  /** Test helper: how many watches are attached. */
  watchers: () => number
}

/**
 * An in-memory SyncRemote for tests and offline demos. Same contract as the
 * Firestore adapter: events unique by identity, preferences overwritten per
 * key, pull returns what changed since the cursor (per event here, per month
 * there) plus every preference if any of them changed. `watch` hears every
 * push to the account, the pushing device's own included, as soon as it lands.
 */
export function createMemorySyncRemote(): MemorySyncRemote {
  const accounts = new Map<string, Account>()

  const accountFor = (uid: string): Account => {
    let account = accounts.get(uid)
    if (!account) {
      account = {
        events: new Map(),
        preferences: new Map(),
        preferencesSeq: 0,
        profile: null,
        seq: 0,
      }
      accounts.set(uid, account)
    }
    return account
  }

  const watchers = new Set<Watcher>()

  const changesSince = (uid: string, cursor: string | null): RemoteChanges => {
    const account = accountFor(uid)
    const after = cursor === null ? 0 : Number(cursor)
    return {
      events: [...account.events.values()]
        .filter((entry) => entry.seq > after)
        .map((entry) => entry.event),
      preferences: account.preferencesSeq > after ? [...account.preferences.values()] : [],
      cursor: String(account.seq),
    }
  }

  /** Like a snapshot listener: told only when something after its cursor exists. */
  const notify = (watcher: Watcher): void => {
    const changes = changesSince(watcher.uid, watcher.cursor)
    if (changes.events.length === 0 && changes.preferences.length === 0) return
    watcher.cursor = changes.cursor
    watcher.onChanges(changes)
  }

  return {
    profile: (uid) => accounts.get(uid)?.profile ?? null,
    watchers: () => watchers.size,
    pull: async (uid, cursor) => changesSince(uid, cursor),
    watch: (uid, cursor, onChanges) => {
      const watcher: Watcher = { uid, cursor, onChanges }
      watchers.add(watcher)
      notify(watcher)
      return (): void => {
        watchers.delete(watcher)
      }
    },
    push: async (uid, changes) => {
      const account = accountFor(uid)
      for (const event of changes.events) {
        // A repeat push must not move the event past other devices' cursors.
        if (account.events.has(identity(event))) continue
        account.events.set(identity(event), { event, seq: ++account.seq })
      }
      for (const preference of changes.preferences) {
        account.preferences.set(preference.key, preference)
      }
      const removed = changes.removedPreferences ?? []
      for (const key of removed) account.preferences.delete(key)
      if (changes.preferences.length > 0 || removed.length > 0) {
        account.preferencesSeq = ++account.seq
      }
      if (changes.profile) account.profile = { schemaVersion: SYNC_META_VERSION }
      for (const watcher of [...watchers]) if (watcher.uid === uid) notify(watcher)
    },
    erase: async (uid) => {
      accounts.delete(uid)
    },
  }
}
