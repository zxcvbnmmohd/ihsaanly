import {
  type CollectionReference,
  collection,
  type DocumentReference,
  type DocumentSnapshot,
  deleteField,
  doc,
  type Firestore,
  getDocs,
  onSnapshot,
  orderBy,
  type Query,
  query,
  serverTimestamp,
  Timestamp,
  type WriteBatch,
  where,
  writeBatch,
} from 'firebase/firestore'
import { z } from 'zod'
import { SYNC_META_VERSION } from '../engine'
import type { RemoteChanges, SyncEvent, SyncPreference, SyncRemote } from '../ports'

/**
 * users/{uid}                     { createdAt, schemaVersion: 2 }
 * users/{uid}/sync/preferences    { type: 'preferences', preferences: { <key>: { value, updatedAt } }, updatedAt }
 * users/{uid}/sync/{YYYY-MM}      { type: 'events', month, events: { '<at>|<kind>|<subject>': { logDay, deltaSeconds } }, updatedAt }
 * feedbackLimits/{uid}            { lastSentAt } — kept by erase(), like feedback (feedback.ts)
 *
 * One collection, so one query (`updatedAt > cursor`) returns every month
 * and the preferences that changed: a sync with nothing new costs one read
 * (the minimum Firestore charges a query), and unchanged preferences are not
 * read again. A month per document keeps that to one read per changed month
 * instead of one per event. ponytail: the Spark free tier (~20k writes / 50k
 * reads a day) carries a couple of thousand daily users at a sync or two
 * each; past that the upgrade is Blaze, not a new data model.
 * firestore.rules caps a month at 3000 events (~100 a day) and preferences at
 * 64 keys; firestore.indexes.json keeps the two maps out of the indexes.
 *
 * Layout 1 (`eventMonths/*`, `state/preferences`, single-letter fields) is
 * no longer read or written; each device re-pushes into this one (engine.ts)
 * and `erase` still deletes it. Remove that once no layout-1 client is left.
 */

/** Firestore allows 500 writes per batch; leave headroom. */
const BATCH_LIMIT = 450
const PREFERENCES_DOC = 'preferences'

// --- pure helpers (unit-tested without the emulator) -----------------------

export const monthOf = (logDay: string): string => logDay.slice(0, 7)

export const eventKey = (event: Pick<SyncEvent, 'at' | 'kind' | 'subject'>): string =>
  `${event.at}|${event.kind}|${event.subject}`

/** Kind never contains '|'; subject may, so it takes the remainder. */
export function parseEventKey(key: string): { at: number; kind: string; subject: string } | null {
  const first = key.indexOf('|')
  const second = key.indexOf('|', first + 1)
  if (first <= 0 || second < 0) return null
  const at = Number(key.slice(0, first))
  if (!Number.isSafeInteger(at)) return null
  return { at, kind: key.slice(first + 1, second), subject: key.slice(second + 1) }
}

interface MonthEntry {
  logDay: string
  deltaSeconds: number | null
}

export function toMonthDocs(events: SyncEvent[]): Map<string, Record<string, MonthEntry>> {
  const months = new Map<string, Record<string, MonthEntry>>()
  for (const event of events) {
    const month = monthOf(event.logDay)
    const entries = months.get(month) ?? {}
    entries[eventKey(event)] = { logDay: event.logDay, deltaSeconds: event.deltaSeconds }
    months.set(month, entries)
  }
  return months
}

const monthEntry = z.object({
  logDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deltaSeconds: z.number().nullable(),
})
const record = z.record(z.string(), z.unknown())

/** Malformed entries are skipped, not fatal: one bad write must not stall sync. */
export function fromMonthDoc(data: unknown): SyncEvent[] {
  const events = record.safeParse(record.safeParse(data).data?.events)
  if (!events.success) return []
  return Object.entries(events.data).flatMap(([key, value]) => {
    const identity = parseEventKey(key)
    const entry = monthEntry.safeParse(value)
    if (!identity || !entry.success) return []
    return [{ ...identity, ...entry.data }]
  })
}

export const toPreferencesMap = (
  preferences: SyncPreference[],
): Record<string, { value: string; updatedAt: number }> =>
  Object.fromEntries(preferences.map(({ key, value, updatedAt }) => [key, { value, updatedAt }]))

const preferenceEntry = z.object({ value: z.string(), updatedAt: z.number() })

export function fromPreferencesDoc(data: unknown): SyncPreference[] {
  const preferences = record.safeParse(record.safeParse(data).data?.preferences)
  if (!preferences.success) return []
  return Object.entries(preferences.data).flatMap(([key, value]) => {
    const entry = preferenceEntry.safeParse(value)
    return entry.success ? [{ key, ...entry.data }] : []
  })
}

/**
 * The cursor is the newest document's exact `updatedAt` as 'seconds.nanos'.
 * Millis would truncate, and `>` a truncated time re-reads that document forever.
 */
export const toCursor = (time: Timestamp): string => `${time.seconds}.${time.nanoseconds}`

export function fromCursor(cursor: string | null): Timestamp | null {
  const match = cursor?.match(/^(\d+)\.(\d+)$/)
  return match ? new Timestamp(Number(match[1]), Number(match[2])) : null
}

/** What a set of sync documents holds, and the newest `updatedAt` among them and `since`. */
export function readSyncDocs(
  docs: Pick<DocumentSnapshot, 'get' | 'data'>[],
  since: Timestamp | null,
): { events: SyncEvent[]; preferences: SyncPreference[]; newest: Timestamp | null } {
  let newest = since
  const events: SyncEvent[] = []
  const preferences: SyncPreference[] = []
  for (const each of docs) {
    const updatedAt = each.get('updatedAt')
    if (updatedAt instanceof Timestamp && (!newest || updatedAt > newest)) newest = updatedAt
    const type = each.get('type')
    if (type === 'events') events.push(...fromMonthDoc(each.data()))
    else if (type === 'preferences') preferences.push(...fromPreferencesDoc(each.data()))
  }
  return { events, preferences, newest }
}

// --- the adapter -------------------------------------------------------------

export function createFirestoreSyncRemote(db: Firestore): SyncRemote {
  const userDoc = (uid: string): DocumentReference => doc(db, 'users', uid)
  const synced = (uid: string): CollectionReference => collection(db, 'users', uid, 'sync')
  /** Layout 1, deleted by `erase` only. */
  const legacyMonths = (uid: string): CollectionReference =>
    collection(db, 'users', uid, 'eventMonths')
  const legacyPreferences = (uid: string): DocumentReference =>
    doc(db, 'users', uid, 'state', 'preferences')

  /** Every sync document written after the cursor, oldest first. */
  const changedSince = (uid: string, since: Timestamp | null): Query =>
    since
      ? query(synced(uid), where('updatedAt', '>', since), orderBy('updatedAt'))
      : query(synced(uid), orderBy('updatedAt'))

  async function commit(ops: ((batch: WriteBatch) => void)[]): Promise<void> {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch)
      await batch.commit()
    }
  }

  return {
    pull: async (uid, cursor): Promise<RemoteChanges> => {
      const since = fromCursor(cursor)
      const snap = await getDocs(changedSince(uid, since))
      const { events, preferences, newest } = readSyncDocs(snap.docs, since)
      return { events, preferences, cursor: newest ? toCursor(newest) : cursor }
    },

    // The same query as `pull`, held open. Firestore charges the first
    // snapshot like a query (one read when nothing is new) and then one read
    // per changed document, so a device that is only watching costs a read
    // per write anywhere on the account (its own included), and nothing while
    // nobody writes. A document only ever moves forward in `updatedAt`, so
    // the filter set at attach time still matches every later change.
    watch: (uid, cursor, onChanges, onError) => {
      let since = fromCursor(cursor)
      let last = cursor
      return onSnapshot(
        changedSince(uid, since),
        (snap) => {
          // Removed: an erase. Pending: this device's own write, before the
          // server stamps it; it comes back confirmed in a later snapshot.
          const docs = snap
            .docChanges()
            .filter((change) => change.type !== 'removed' && !change.doc.metadata.hasPendingWrites)
            .map((change) => change.doc)
          if (docs.length === 0) return
          const { events, preferences, newest } = readSyncDocs(docs, since)
          since = newest
          last = newest ? toCursor(newest) : last
          onChanges({ events, preferences, cursor: last })
        },
        (error) => onError?.(error),
      )
    },

    push: async (uid, { events, preferences, removedPreferences = [], profile = false }) => {
      const ops: ((batch: WriteBatch) => void)[] = []
      if (profile) {
        // A plain set, not a merge: it also replaces a layout-1 profile
        // ({ createdAt, schema }), which the rules' exact keys would refuse
        // to merge into.
        ops.push((b) =>
          b.set(userDoc(uid), { createdAt: serverTimestamp(), schemaVersion: SYNC_META_VERSION }),
        )
      }
      // set+merge with nested objects, never update() with field paths: keys
      // hold '.' and '/' that a field path would split on.
      for (const [month, entries] of toMonthDocs(events)) {
        ops.push((b) =>
          b.set(
            doc(synced(uid), month),
            { type: 'events', month, events: entries, updatedAt: serverTimestamp() },
            { merge: true },
          ),
        )
      }
      if (preferences.length > 0 || removedPreferences.length > 0) {
        const removals = Object.fromEntries(removedPreferences.map((key) => [key, deleteField()]))
        ops.push((b) =>
          b.set(
            doc(synced(uid), PREFERENCES_DOC),
            {
              type: 'preferences',
              preferences: { ...removals, ...toPreferencesMap(preferences) },
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        )
      }
      await commit(ops)
    },

    erase: async (uid) => {
      const [current, legacy] = await Promise.all([
        getDocs(synced(uid)),
        getDocs(legacyMonths(uid)),
      ])
      await commit([
        ...[...current.docs, ...legacy.docs].map((each) => (b: WriteBatch) => b.delete(each.ref)),
        (b) => b.delete(legacyPreferences(uid)),
        (b) => b.delete(userDoc(uid)),
        // feedback and feedbackLimits/{uid} stay (see feedback.ts): a client
        // that could delete its limit doc could dodge the rate limit.
      ])
    },
  }
}
