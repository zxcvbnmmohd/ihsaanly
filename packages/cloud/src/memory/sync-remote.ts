import type { SyncEvent, SyncPreference, SyncRemote } from '../ports'

interface Account {
  /** Insertion order is the change order; `seq` is what the cursor counts. */
  events: Map<string, { event: SyncEvent; seq: number }>
  preferences: Map<string, SyncPreference>
  seq: number
}

const identity = (event: SyncEvent): string => `${event.at}|${event.kind}|${event.subject}`

/**
 * An in-memory SyncRemote for tests and offline demos. Same contract as the
 * Firestore adapter: events unique by identity, preferences overwritten per
 * key, pull returns what changed since the cursor (per event here, per month
 * there) plus every preference.
 */
export function createMemorySyncRemote(): SyncRemote {
  const accounts = new Map<string, Account>()

  const accountFor = (uid: string): Account => {
    let account = accounts.get(uid)
    if (!account) {
      account = { events: new Map(), preferences: new Map(), seq: 0 }
      accounts.set(uid, account)
    }
    return account
  }

  return {
    pull: async (uid, cursor) => {
      const account = accountFor(uid)
      const after = cursor === null ? 0 : Number(cursor)
      return {
        events: [...account.events.values()]
          .filter((entry) => entry.seq > after)
          .map((entry) => entry.event),
        preferences: [...account.preferences.values()],
        cursor: String(account.seq),
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
    },
    erase: async (uid) => {
      accounts.delete(uid)
    },
  }
}
