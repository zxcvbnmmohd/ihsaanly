import { useSyncExternalStore } from 'react'

import type { Prayer } from '@/prayer/qada'

import { database } from './database'

export type EventKind =
  'prayer-performed' | 'prayer-unmarked' | 'prayer-missed' | 'prayer-made-up' | 'item-completed'

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

/** Temporary, for diagnosing #9 on device. */
export function lastStorageError(): string | null {
  return lastError
}

function attempt<T>(label: string, work: () => T, fallback: T): T {
  try {
    return work()
  } catch (error) {
    lastError = `${label}: ${error instanceof Error ? error.message : String(error)}`
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

export function prayerMarksOn(logDay: string): Partial<Record<Prayer, Date>> {
  const rows = attempt(
    'prayerMarksOn',
    () =>
      database.getAllSync<{ subject: string; kind: EventKind; at: number }>(
        `SELECT subject, kind, at FROM events
     WHERE kind IN ('prayer-performed', 'prayer-unmarked') AND log_day = ?
     ORDER BY id ASC`,
        logDay,
      ),
    [],
  )

  // Later facts supersede earlier ones. Nothing is deleted, so the correction
  // itself stays in the record.
  const marks: Partial<Record<Prayer, Date>> = {}
  rows.forEach((row) => {
    const prayer = row.subject as Prayer
    if (row.kind === 'prayer-performed') marks[prayer] = new Date(row.at)
    else delete marks[prayer]
  })

  return marks
}

export function markedPrayersOn(logDay: string): Prayer[] {
  return Object.keys(prayerMarksOn(logDay)) as Prayer[]
}

/** Outstanding make-up per prayer: what was missed, less what has been made up. */
export function qadaCounts(): Partial<Record<Prayer, number>> {
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

  return Object.fromEntries(Object.entries(counts).filter(([, count]) => (count ?? 0) > 0))
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

export interface RecentEvent {
  id: number
  kind: string
  subject: string
  at: number
  logDay: string
}

/** Temporary, for diagnosing #9 on device. Removed once marking is trusted. */
export function recentEvents(limit = 12): RecentEvent[] {
  return database.getAllSync<RecentEvent>(
    `SELECT id, kind, subject, at, log_day AS logDay FROM events ORDER BY id DESC LIMIT ?`,
    limit,
  )
}

export function eventCount(): number {
  const row = database.getFirstSync<{ total: number }>('SELECT COUNT(*) AS total FROM events')
  return row?.total ?? 0
}

export function schemaVersion(): number {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  return row?.user_version ?? -1
}
