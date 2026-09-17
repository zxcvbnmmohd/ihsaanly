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
  announce()
}

export function prayerMarksOn(logDay: string): Partial<Record<Prayer, Date>> {
  const rows = database.getAllSync<{ subject: string; kind: EventKind; at: number }>(
    `SELECT subject, kind, at FROM events
     WHERE kind IN ('prayer-performed', 'prayer-unmarked') AND log_day = ?
     ORDER BY id ASC`,
    logDay,
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

export function useEventVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return (): void => {
        listeners.delete(listener)
      }
    },
    () => version,
  )
}
