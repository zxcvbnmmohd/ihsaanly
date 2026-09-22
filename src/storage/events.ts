import { useSyncExternalStore } from 'react'

import type { ExportedEvent } from '@/data/bundle'
import type { Prayer } from '@/prayer/qada'

import { database, lastDatabaseError } from './database'

export type EventKind =
  | 'prayer-performed'
  | 'prayer-unmarked'
  | 'prayer-missed'
  | 'prayer-made-up'
  | 'item-completed'
  | 'item-uncompleted'

export interface NewEvent {
  kind: EventKind
  subject: string
  at: Date
  logDay: string
  windowStart?: Date
  windowEnd?: Date
}

const listeners = new Set<() => void>()
let version = 0
let lastError: string | null = null

/** Kept for the diagnostic bundle in #18. A failed open outranks a failed query. */
export function lastStorageError(): string | null {
  return lastDatabaseError() ?? lastError
}

/**
 * Record a failure where the diagnostic bundle will find it. Exported because
 * work outside this file fails the same way and a console line reaches nobody
 * once the app is installed.
 */
export function noteFailure(label: string, error: unknown): void {
  lastError = `${label}: ${error instanceof Error ? error.message : String(error)}`
}

function attempt<T>(label: string, work: () => T, fallback: T): T {
  try {
    return work()
  } catch (error) {
    noteFailure(label, error)
    return fallback
  }
}

function announce(): void {
  version += 1
  listeners.forEach((listener) => listener())
}

/**
 * How early or late the action was, relative to the window it belonged to.
 * Signed: negative is early. Recorded because it costs nothing now and cannot
 * be reconstructed later.
 */
function deltaSeconds(event: NewEvent): number | null {
  if (!event.windowStart || !event.windowEnd) return null
  const middle = (event.windowStart.getTime() + event.windowEnd.getTime()) / 2
  return Math.round((event.at.getTime() - middle) / 1000)
}

export function recordEvent(event: NewEvent): void {
  attempt('recordEvent', () => writeEvent(event), undefined)
  announce()
}

/** Several facts at once, one transaction, one announcement. */
export function recordEvents(events: NewEvent[]): void {
  attempt(
    'recordEvents',
    () => database.withTransactionSync(() => events.forEach(writeEvent)),
    undefined,
  )
  announce()
}

function writeEvent(event: NewEvent): void {
  database.runSync(
    `INSERT INTO events (kind, subject, at, log_day, window_start, window_end, delta_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    event.kind,
    event.subject,
    event.at.getTime(),
    event.logDay,
    event.windowStart?.getTime() ?? null,
    event.windowEnd?.getTime() ?? null,
    deltaSeconds(event),
  )
}

/**
 * The latest of an on/off pair per subject on one day. Later facts supersede
 * earlier ones; nothing is deleted, so the correction itself stays in the
 * record.
 */
function readToggles(logDay: string, on: EventKind, off: EventKind): Partial<Record<string, Date>> {
  const rows = attempt(
    'readToggles',
    () =>
      database.getAllSync<{ subject: string; kind: EventKind; at: number }>(
        `SELECT subject, kind, at FROM events
         WHERE kind IN (?, ?) AND log_day = ?
         ORDER BY id ASC`,
        on,
        off,
        logDay,
      ),
    [],
  )

  const latest: Partial<Record<string, Date>> = {}
  rows.forEach((row) => {
    if (row.kind === on) latest[row.subject] = new Date(row.at)
    else delete latest[row.subject]
  })

  return latest
}

function readMarks(logDay: string): Partial<Record<Prayer, Date>> {
  return readToggles(logDay, 'prayer-performed', 'prayer-unmarked') as Partial<Record<Prayer, Date>>
}

interface Cached<T> {
  version: number
  value: T
}

const marksCache = new Map<string, Cached<Partial<Record<Prayer, Date>>>>()
const completionsCache = new Map<string, Cached<Partial<Record<string, Date>>>>()
let qadaCache: Cached<Partial<Record<Prayer, number>>> | null = null

/**
 * Snapshots are cached per store version so `getSnapshot` returns the same
 * reference until something is recorded. That is what useSyncExternalStore
 * needs, and it is what the React Compiler cannot reinterpret: a memoised read
 * inferred its dependencies from the arguments alone, so a recorded event never
 * invalidated it and the screen showed the write only after a reload.
 */
function marksSnapshot(logDay: string): Partial<Record<Prayer, Date>> {
  const cached = marksCache.get(logDay)
  if (cached && cached.version === version) return cached.value

  const value = readMarks(logDay)
  marksCache.set(logDay, { version, value })
  return value
}

function completionsSnapshot(logDay: string): Partial<Record<string, Date>> {
  const cached = completionsCache.get(logDay)
  if (cached && cached.version === version) return cached.value

  const value = readToggles(logDay, 'item-completed', 'item-uncompleted')
  completionsCache.set(logDay, { version, value })
  return value
}

export function useCompletedOn(logDay: string): Partial<Record<string, Date>> {
  return useSyncExternalStore(subscribe, () => completionsSnapshot(logDay))
}

function qadaSnapshot(): Partial<Record<Prayer, number>> {
  if (qadaCache && qadaCache.version === version) return qadaCache.value

  const value = readQadaCounts()
  qadaCache = { version, value }
  return value
}

export function prayerMarksOn(logDay: string): Partial<Record<Prayer, Date>> {
  return marksSnapshot(logDay)
}

export function useMarksOn(logDay: string): Partial<Record<Prayer, Date>> {
  return useSyncExternalStore(subscribe, () => marksSnapshot(logDay))
}

export function useQadaCounts(): Partial<Record<Prayer, number>> {
  return useSyncExternalStore(subscribe, qadaSnapshot)
}

export function markedPrayersOn(logDay: string): Prayer[] {
  return Object.keys(prayerMarksOn(logDay)) as Prayer[]
}

/**
 * Net per prayer: what was missed, less what has been made up. Raw, and it can
 * go negative when a backlog from before tracking is being paid down; the
 * clamp lives in `outstanding` in prayer/qada.ts, next to the backlog it adds.
 */
function readQadaCounts(): Partial<Record<Prayer, number>> {
  const rows = database.getAllSync<{ subject: string; kind: EventKind; total: number }>(
    `SELECT subject, kind, COUNT(*) AS total FROM events
     WHERE kind IN ('prayer-missed', 'prayer-made-up')
     GROUP BY subject, kind`,
  )

  const counts: Partial<Record<Prayer, number>> = {}
  rows.forEach((row) => {
    const prayer = row.subject as Prayer
    const sign = row.kind === 'prayer-missed' ? 1 : -1
    counts[prayer] = (counts[prayer] ?? 0) + sign * row.total
  })

  return counts
}

/**
 * Hoisted rather than inline: a `subscribe` that changes identity every render
 * makes React unsubscribe and resubscribe each time, and an event recorded in
 * that gap is lost.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

function currentVersion(): number {
  return version
}

export function useEventVersion(): number {
  return useSyncExternalStore(subscribe, currentVersion)
}

import type { LoggedAction } from '@/plan/history'

export function allActions(): LoggedAction[] {
  return attempt(
    'allActions',
    () =>
      database.getAllSync<LoggedAction>(
        `SELECT kind, subject, at, log_day AS logDay, delta_seconds AS deltaSeconds
         FROM events ORDER BY id ASC`,
      ),
    [],
  )
}

let actionsCache: Cached<LoggedAction[]> | null = null

function actionsSnapshot(): LoggedAction[] {
  if (actionsCache && actionsCache.version === version) return actionsCache.value

  const value = allActions()
  actionsCache = { version, value }
  return value
}

export function useActions(): LoggedAction[] {
  return useSyncExternalStore(subscribe, actionsSnapshot)
}

export function insertExportedEvents(events: ExportedEvent[]): number {
  return attempt(
    'insertExportedEvents',
    () => {
      events.forEach((event) =>
        database.runSync(
          `INSERT INTO events (kind, subject, at, log_day, window_start, window_end, delta_seconds)
           VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
          event.kind,
          event.subject,
          event.at,
          event.logDay,
          event.deltaSeconds,
        ),
      )
      announce()
      return events.length
    },
    0,
  )
}

export function allPreferences(): Record<string, unknown> {
  const rows = attempt(
    'allPreferences',
    () => database.getAllSync<{ key: string; value: string }>('SELECT key, value FROM preferences'),
    [],
  )

  return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value) as unknown]))
}
