import type { LocalStore, SyncEvent, SyncMeta, SyncPreference } from '../ports'

export interface MemoryLocalStore extends LocalStore {
  /** Test helper: something the user did on this device, not yet pushed. */
  record: (event: SyncEvent) => void
  /** Test helper: a local preference change at `at`. */
  setPreference: (key: string, value: string, at: number) => void
  /** Test helper: everything on the device, with its sync flag. */
  events: () => (SyncEvent & { id: number; synced: boolean })[]
}

const identity = (event: SyncEvent): string => `${event.at}|${event.kind}|${event.subject}`

/** A fake device: an event log with sync flags, a preference map and meta. */
export function createMemoryLocalStore(): MemoryLocalStore {
  const log: (SyncEvent & { id: number; synced: boolean })[] = []
  const preferences = new Map<string, SyncPreference>()
  let nextId = 1
  let meta: SyncMeta = { boundUid: null, cursor: null, lastSyncedAt: null }

  const add = (event: SyncEvent, synced: boolean): void => {
    log.push({ ...event, id: nextId++, synced })
  }

  return {
    record: (event) => add(event, false),
    setPreference: (key, value, at) => {
      preferences.set(key, { key, value, updatedAt: at })
    },
    events: () => log.map((event) => ({ ...event })),
    unsyncedEvents: () =>
      log.filter((event) => !event.synced).map(({ synced: _synced, ...event }) => event),
    markSynced: (ids) => {
      for (const event of log) if (ids.includes(event.id)) event.synced = true
    },
    resetSynced: () => {
      for (const event of log) event.synced = false
    },
    insertRemoteEvents: (events) => {
      const known = new Set(log.map(identity))
      let inserted = 0
      for (const event of events) {
        if (known.has(identity(event))) continue
        known.add(identity(event))
        add(event, true)
        inserted++
      }
      return inserted
    },
    preferences: () => [...preferences.values()],
    applyPreferences: (next) => {
      for (const preference of next) preferences.set(preference.key, preference)
    },
    readMeta: () => ({ ...meta }),
    writeMeta: (next) => {
      meta = { ...next }
    },
  }
}
