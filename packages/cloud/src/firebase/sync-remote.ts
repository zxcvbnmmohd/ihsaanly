import {
  type CollectionReference,
  collection,
  type DocumentReference,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type WriteBatch,
  where,
  writeBatch,
} from 'firebase/firestore'
import { z } from 'zod'
import type { RemoteChanges, SyncEvent, SyncPreference, SyncRemote } from '../ports'

/**
 * users/{uid}                      { createdAt, schema }
 * users/{uid}/eventMonths/{YYYY-MM} { events: { '<at>|<kind>|<subject>': { l, d } }, updatedAt }
 * users/{uid}/state/preferences    { prefs: { <key>: { v, t } }, updatedAt }
 * feedbackLimits/{uid}             { lastAt } — kept by erase(), like feedback (feedback.ts)
 *
 * A month per document keeps a sync to one read per changed month instead of
 * one per event. ponytail: the Spark free tier (~20k writes / 50k reads a day)
 * carries a couple of thousand daily users at a sync or two each; past that
 * the upgrade is Blaze, not a new data model. firestore.rules caps a month at
 * 3000 events (~100 a day) and preferences at 64 keys.
 */

const SCHEMA = 1
/** Firestore allows 500 writes per batch; leave headroom. */
const BATCH_LIMIT = 450

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
  l: string
  d: number | null
}

export function toMonthDocs(events: SyncEvent[]): Map<string, Record<string, MonthEntry>> {
  const months = new Map<string, Record<string, MonthEntry>>()
  for (const event of events) {
    const month = monthOf(event.logDay)
    const entries = months.get(month) ?? {}
    entries[eventKey(event)] = { l: event.logDay, d: event.deltaSeconds }
    months.set(month, entries)
  }
  return months
}

const monthEntry = z.object({
  l: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  d: z.number().nullable(),
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
    return [{ ...identity, logDay: entry.data.l, deltaSeconds: entry.data.d }]
  })
}

export const toPrefsMap = (
  preferences: SyncPreference[],
): Record<string, { v: string; t: number }> =>
  Object.fromEntries(preferences.map((p) => [p.key, { v: p.value, t: p.updatedAt }]))

const prefEntry = z.object({ v: z.string(), t: z.number() })

export function fromPrefsDoc(data: unknown): SyncPreference[] {
  const prefs = record.safeParse(record.safeParse(data).data?.prefs)
  if (!prefs.success) return []
  return Object.entries(prefs.data).flatMap(([key, value]) => {
    const entry = prefEntry.safeParse(value)
    return entry.success ? [{ key, value: entry.data.v, updatedAt: entry.data.t }] : []
  })
}

/**
 * The cursor is the newest month's exact `updatedAt` as 'seconds.nanos'.
 * Millis would truncate, and `>` a truncated time re-reads that month forever.
 */
export const toCursor = (time: Timestamp): string => `${time.seconds}.${time.nanoseconds}`

export function fromCursor(cursor: string | null): Timestamp | null {
  const match = cursor?.match(/^(\d+)\.(\d+)$/)
  return match ? new Timestamp(Number(match[1]), Number(match[2])) : null
}

// --- the adapter -------------------------------------------------------------

export function createFirestoreSyncRemote(db: Firestore): SyncRemote {
  const userDoc = (uid: string): DocumentReference => doc(db, 'users', uid)
  const months = (uid: string): CollectionReference => collection(db, 'users', uid, 'eventMonths')
  const prefsDoc = (uid: string): DocumentReference => doc(db, 'users', uid, 'state', 'preferences')
  /** Users whose root doc is known to exist, so a push checks once per session. */
  const known = new Set<string>()

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
      const [monthSnap, prefsSnap] = await Promise.all([
        getDocs(
          since
            ? query(months(uid), where('updatedAt', '>', since), orderBy('updatedAt'))
            : query(months(uid), orderBy('updatedAt')),
        ),
        getDoc(prefsDoc(uid)),
      ])
      let newest = since
      const events = monthSnap.docs.flatMap((snap) => {
        const updatedAt = snap.get('updatedAt')
        if (updatedAt instanceof Timestamp && (!newest || updatedAt > newest)) newest = updatedAt
        return fromMonthDoc(snap.data())
      })
      return {
        events,
        preferences: fromPrefsDoc(prefsSnap.data()),
        cursor: newest ? toCursor(newest) : cursor,
      }
    },

    push: async (uid, { events, preferences }) => {
      const ops: ((batch: WriteBatch) => void)[] = []
      if (!known.has(uid)) {
        if (!(await getDoc(userDoc(uid))).exists()) {
          ops.push((b) =>
            b.set(userDoc(uid), { createdAt: serverTimestamp(), schema: SCHEMA }, { merge: true }),
          )
        }
        known.add(uid)
      }
      // set+merge with nested objects, never update() with field paths: keys
      // hold '.' and '/' that a field path would split on.
      for (const [month, entries] of toMonthDocs(events)) {
        ops.push((b) =>
          b.set(
            doc(months(uid), month),
            { events: entries, updatedAt: serverTimestamp() },
            { merge: true },
          ),
        )
      }
      if (preferences.length > 0) {
        ops.push((b) =>
          b.set(
            prefsDoc(uid),
            { prefs: toPrefsMap(preferences), updatedAt: serverTimestamp() },
            { merge: true },
          ),
        )
      }
      await commit(ops)
    },

    erase: async (uid) => {
      const snap = await getDocs(months(uid))
      await commit([
        ...snap.docs.map((month) => (b: WriteBatch) => b.delete(month.ref)),
        (b) => b.delete(prefsDoc(uid)),
        (b) => b.delete(userDoc(uid)),
        // feedback and feedbackLimits/{uid} stay (see feedback.ts): a client
        // that could delete its limit doc could dodge the rate limit.
      ])
      known.delete(uid)
    },
  }
}
