/**
 * Runs in place of `./backend` when the bundler targets web — the platform
 * picks whichever file matches, so nothing else in the package knows which one
 * is live (pattern: see the header of `apps/mobile/src/widgets/publish.ts`).
 *
 * Ihsaanly on the web has no SQLite. Everything below keeps one JSON object at
 * a single localStorage key, mirrored in memory: loaded once at startup, read
 * from the mirror, and written straight through — to the mirror always, to
 * localStorage when it is reachable. A failed write leaves the session working
 * in memory only and records why, the same shape `lastDatabaseError` already
 * gives native callers.
 *
 * ponytail: localStorage, ~5 MB ceiling; move to IndexedDB behind this file if exceeded
 */
import type { LoggedAction } from '@ihsaanly/core/plan/history'

import type {
  CountRow,
  EventRow,
  ExportedRow,
  FastRow,
  TimedPreferenceRow,
  ToggleRow,
} from './backend'

const STORAGE_KEY = 'ihsaanly.db.v1'

interface StoredEvent extends EventRow {
  id: number
  /** Absent in blobs written before sync, which is the same as not pushed. */
  synced?: boolean
}

interface Store {
  preferences: Record<string, string>
  events: StoredEvent[]
  /** When each preference was last set (ms). Absent before sync; a missing key reads 0. */
  preferenceTimes?: Record<string, number>
}

let openError: string | null = null

function emptyStore(): Store {
  return { preferences: {}, events: [] }
}

function isStore(value: unknown): value is Store {
  return typeof value === 'object' && value !== null && 'preferences' in value && 'events' in value
}

function load(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()

    const parsed: unknown = JSON.parse(raw)
    return isStore(parsed) ? parsed : emptyStore()
  } catch (error) {
    openError = `open: ${error instanceof Error ? error.message : String(error)}`
    return emptyStore()
  }
}

const identity = (event: { kind: string; subject: string; at: number }): string =>
  `${event.kind}|${event.subject}|${event.at}`

/**
 * Oldest first by instant, id breaking ties — the order the SQLite backend
 * reads in. Insertion order is not enough once another device's facts arrive.
 */
const chronological = (left: StoredEvent, right: StoredEvent): number =>
  left.at - right.at || left.id - right.id

/**
 * The same repair migration 3 makes natively: repeats of one identity (a batch
 * that shared an instant) are nudged forward by their rank so none is lost, and
 * anything still colliding after that is dropped.
 */
function withUniqueIdentities(events: StoredEvent[]): StoredEvent[] {
  const ranks = new Map<string, number>()
  const seen = new Set<string>()
  const byId = [...events].sort((left, right) => left.id - right.id)

  return byId.flatMap((event) => {
    const rank = ranks.get(identity(event)) ?? 0
    ranks.set(identity(event), rank + 1)
    const nudged = rank === 0 ? event : { ...event, at: event.at + rank }
    if (seen.has(identity(nudged))) return []
    seen.add(identity(nudged))
    return [nudged]
  })
}

// Loaded once, mirrored in memory from here on. A page reload reads it again.
const store = load()
store.events = withUniqueIdentities(store.events)
let nextId = store.events.reduce((max, event) => Math.max(max, event.id), 0) + 1
const identities = new Set(store.events.map(identity))

// Best-effort: asks the browser not to evict this origin's storage under
// pressure. Declining changes nothing else here.
if (typeof navigator !== 'undefined') void navigator.storage?.persist?.()

function persist(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    openError = `write: ${error instanceof Error ? error.message : String(error)}`
  }
}

export function lastDatabaseError(): string | null {
  return openError
}

export function wipe(): void {
  store.events = []
  store.preferences = {}
  store.preferenceTimes = {}
  identities.clear()
  persist()
}

// --- preferences -------------------------------------------------------

export function readPreferenceRow(key: string): { value: string } | null {
  const value = store.preferences[key]
  return value === undefined ? null : { value }
}

export function writePreferenceRow(key: string, json: string): void {
  writePreferenceRowAt(key, json, Date.now())
}

export function writePreferenceRowAt(key: string, json: string, updatedAt: number): void {
  store.preferences[key] = json
  store.preferenceTimes = { ...store.preferenceTimes, [key]: updatedAt }
  persist()
}

export function allPreferenceRows(): { key: string; value: string }[] {
  return Object.entries(store.preferences).map(([key, value]) => ({ key, value }))
}

export function preferenceRowsWithTime(): TimedPreferenceRow[] {
  return Object.entries(store.preferences).map(([key, value]) => ({
    key,
    value,
    updatedAt: store.preferenceTimes?.[key] ?? 0,
  }))
}

// --- events --------------------------------------------------------------

/** Appends unless the identity is already stored, like the native INSERT OR IGNORE. */
function append(event: Omit<StoredEvent, 'id'>): boolean {
  if (identities.has(identity(event))) return false
  identities.add(identity(event))
  store.events.push({ ...event, id: nextId })
  nextId += 1
  return true
}

export function insertEvents(rows: EventRow[]): void {
  rows.forEach((row) => append({ ...row, synced: false }))
  persist()
}

export function toggleRowsFor(on: string, off: string, logDay: string): ToggleRow[] {
  return store.events
    .filter((event) => (event.kind === on || event.kind === off) && event.logDay === logDay)
    .sort(chronological)
    .map((event) => ({ subject: event.subject, kind: event.kind, at: event.at }))
}

export function countRows(kinds: string[]): CountRow[] {
  const totals = new Map<string, number>()

  store.events
    .filter((event) => kinds.includes(event.kind))
    .forEach((event) => {
      const key = `${event.subject}\u0000${event.kind}`
      totals.set(key, (totals.get(key) ?? 0) + 1)
    })

  return Array.from(totals.entries()).map(([key, total]) => {
    const [subject = '', kind = ''] = key.split('\u0000')
    return { subject, kind, total }
  })
}

export function firstMarkedLogDay(): string | null {
  const rows = store.events
    .filter((event) => event.kind === 'prayer-performed')
    .sort((left, right) => left.at - right.at)
  return rows[0]?.logDay ?? null
}

export function fastRows(): FastRow[] {
  const kinds = new Set(['fast-owed', 'fast-owed-cleared', 'fast-made-up'])
  return store.events
    .filter((event) => kinds.has(event.kind))
    .sort(chronological)
    .map((event) => ({ kind: event.kind, logDay: event.logDay }))
}

export function actionRows(): LoggedAction[] {
  return [...store.events].sort(chronological).map((event) => ({
    kind: event.kind,
    subject: event.subject,
    at: event.at,
    logDay: event.logDay,
    deltaSeconds: event.deltaSeconds,
  }))
}

function insertRows(rows: ExportedRow[], synced: boolean): number {
  const inserted = rows.filter((row) =>
    append({
      kind: row.kind,
      subject: row.subject,
      at: row.at,
      logDay: row.logDay,
      windowStart: null,
      windowEnd: null,
      deltaSeconds: row.deltaSeconds,
      synced,
    }),
  ).length
  persist()
  return inserted
}

export function insertExportedRows(rows: ExportedRow[]): number {
  return insertRows(rows, false)
}

// --- sync ------------------------------------------------------------------

export function insertSyncedRows(rows: ExportedRow[]): number {
  return insertRows(rows, true)
}

export function unsyncedEventRows(): (ExportedRow & { id: number })[] {
  return store.events
    .filter((event) => event.synced !== true)
    .map((event) => ({
      id: event.id,
      kind: event.kind,
      subject: event.subject,
      at: event.at,
      logDay: event.logDay,
      deltaSeconds: event.deltaSeconds,
    }))
}

export function markEventsSynced(ids: number[]): void {
  const marked = new Set(ids)
  store.events.forEach((event) => {
    if (marked.has(event.id)) event.synced = true
  })
  persist()
}

export function resetEventsSynced(): void {
  store.events.forEach((event) => {
    event.synced = false
  })
  persist()
}
