import type { LoggedAction } from '@ihsaanly/core/plan/history'
import Constants from 'expo-constants'
import { Paths } from 'expo-file-system'
import * as SQLite from 'expo-sqlite'

import { migrate } from './migrations'

/** Each build variant has its own group, set by `app.config.ts`. */
const configuredGroup: unknown = Constants.expoConfig?.extra?.appGroup
const APP_GROUP =
  typeof configuredGroup === 'string' ? configuredGroup : 'group.app.ihsaanly.companion'

/**
 * The single switch. Widgets run in a separate process and can only read a
 * shared container, which needs an Apple Developer Program membership (#16).
 * Until that exists, storage is app-local.
 */
const SHARED_CONTAINER_ENABLED = false

/** Exported so the switch-on path can be tested while the switch is off. */
export function databaseDirectoryFor(enabled: boolean, group: string): string | undefined {
  if (!enabled) return undefined
  return Paths.appleSharedContainers[group]?.uri
}

function databaseDirectory(): string | undefined {
  return databaseDirectoryFor(SHARED_CONTAINER_ENABLED, APP_GROUP)
}

let openError: string | null = null

/** Surfaced in the diagnostic bundle, since a fallback session looks normal otherwise. */
export function lastDatabaseError(): string | null {
  return openError
}

/**
 * This runs while the module is still being evaluated, which is before Expo
 * Router has mounted anything — so a throw here is a white screen with no
 * message rather than something the error boundary can catch. A device with a
 * corrupt or unwritable database therefore falls back to one in memory: the app
 * opens and works, it just forgets when it closes, and the reason travels in the
 * diagnostic report.
 *
 * ponytail: no recovery beyond that. If opening an in-memory database fails too,
 * the device has larger problems than this app can paper over.
 */
export function connect(): SQLite.SQLiteDatabase {
  openError = null
  try {
    const connection = SQLite.openDatabaseSync('ihsaanly.db', undefined, databaseDirectory())
    migrate(connection)
    return connection
  } catch (error) {
    openError = `open: ${error instanceof Error ? error.message : String(error)}`
    const memory = SQLite.openDatabaseSync(':memory:')
    migrate(memory)
    return memory
  }
}

const database = connect()

/**
 * Everything, in one transaction. The only deletion in the app, and only at
 * the user's explicit request from the Data screen. Callers reload the app
 * afterwards, because every preference store caches its value in memory.
 */
export function wipe(): void {
  database.withTransactionSync(() => {
    database.execSync('DELETE FROM events')
    database.execSync('DELETE FROM preferences')
  })
}

// --- preferences -----------------------------------------------------------

export function readPreferenceRow(key: string): { value: string } | null {
  return database.getFirstSync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    key,
  )
}

/** A local write, stamped now so it wins a merge against anything older. */
export function writePreferenceRow(key: string, json: string): void {
  writePreferenceRowAt(key, json, Date.now())
}

/** Keeps the given stamp: a value arriving from sync stays as old as it really is. */
export function writePreferenceRowAt(key: string, json: string, updatedAt: number): void {
  database.runSync(
    `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    json,
    updatedAt,
  )
}

/** Item progress for a finished period, or a key another device dropped. Nothing else is deleted. */
export function deletePreferenceRows(keys: string[]): void {
  database.withTransactionSync(() => {
    for (const key of keys) database.runSync('DELETE FROM preferences WHERE key = ?', key)
  })
}

export function allPreferenceRows(): { key: string; value: string }[] {
  return database.getAllSync<{ key: string; value: string }>('SELECT key, value FROM preferences')
}

export interface TimedPreferenceRow {
  key: string
  value: string
  updatedAt: number
}

export function preferenceRowsWithTime(): TimedPreferenceRow[] {
  return database.getAllSync<TimedPreferenceRow>(
    'SELECT key, value, updated_at AS updatedAt FROM preferences',
  )
}

// --- downloaded content ------------------------------------------------------

/** One row of the content cache, or null. Not a preference: never synced, exported or wiped. */
export function readContentRow(key: string): string | null {
  return (
    database.getFirstSync<{ value: string }>('SELECT value FROM content_cache WHERE key = ?', key)
      ?.value ?? null
  )
}

/** Replaces the row in one statement, so a reader sees the old value or the new, never half. */
export function writeContentRow(key: string, value: string): boolean {
  try {
    database.runSync(
      `INSERT INTO content_cache (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value,
    )
    return true
  } catch {
    return false
  }
}

export function removeContentRow(key: string): void {
  database.runSync('DELETE FROM content_cache WHERE key = ?', key)
}

// --- events ------------------------------------------------------------

export interface EventRow {
  kind: string
  subject: string
  at: number
  logDay: string
  windowStart: number | null
  windowEnd: number | null
  deltaSeconds: number | null
}

/**
 * One or several, always in a transaction: a batch of facts either all land or
 * none do. A fact already present (same kind, subject and instant) is skipped.
 */
export function insertEvents(rows: EventRow[]): void {
  database.withTransactionSync(() => {
    rows.forEach((row) => {
      database.runSync(
        `INSERT OR IGNORE INTO events
           (kind, subject, at, log_day, window_start, window_end, delta_seconds, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        row.kind,
        row.subject,
        row.at,
        row.logDay,
        row.windowStart,
        row.windowEnd,
        row.deltaSeconds,
      )
    })
  })
}

export interface ToggleRow {
  subject: string
  kind: string
  at: number
}

/**
 * The raw rows behind an on/off pair for one day, oldest first. By instant, not
 * id: a fact merged from another device arrives after later local ones.
 */
export function toggleRowsFor(on: string, off: string, logDay: string): ToggleRow[] {
  return database.getAllSync<ToggleRow>(
    `SELECT subject, kind, at FROM events
     WHERE kind IN (?, ?) AND log_day = ?
     ORDER BY at ASC, id ASC`,
    on,
    off,
    logDay,
  )
}

export interface CountRow {
  subject: string
  kind: string
  total: number
}

/** Per subject, per kind, how many events of any of `kinds` exist. */
export function countRows(kinds: string[]): CountRow[] {
  const placeholders = kinds.map(() => '?').join(', ')
  return database.getAllSync<CountRow>(
    `SELECT subject, kind, COUNT(*) AS total FROM events
     WHERE kind IN (${placeholders})
     GROUP BY subject, kind`,
    ...kinds,
  )
}

/** The civil day of the earliest `prayer-performed` event, or null. */
export function firstMarkedLogDay(): string | null {
  const row = database.getFirstSync<{ logDay: string }>(
    `SELECT log_day AS logDay FROM events
     WHERE kind = 'prayer-performed'
     ORDER BY at ASC LIMIT 1`,
  )
  return row?.logDay ?? null
}

export interface FastRow {
  kind: string
  logDay: string
}

/** Every fasting event, oldest first. */
export function fastRows(): FastRow[] {
  return database.getAllSync<FastRow>(
    `SELECT kind, log_day AS logDay FROM events
     WHERE kind IN ('fast-owed', 'fast-owed-cleared', 'fast-made-up')
     ORDER BY at ASC, id ASC`,
  )
}

/** Every event ever recorded, oldest first — the whole log. */
export function actionRows(): LoggedAction[] {
  return database.getAllSync<LoggedAction>(
    `SELECT kind, subject, at, log_day AS logDay, delta_seconds AS deltaSeconds
     FROM events ORDER BY at ASC, id ASC`,
  )
}

export interface ExportedRow {
  kind: string
  subject: string
  at: number
  logDay: string
  deltaSeconds: number | null
}

function insertRows(rows: ExportedRow[], synced: 0 | 1): number {
  let inserted = 0
  database.withTransactionSync(() => {
    rows.forEach((row) => {
      const result = database.runSync(
        `INSERT OR IGNORE INTO events
           (kind, subject, at, log_day, window_start, window_end, delta_seconds, synced)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
        row.kind,
        row.subject,
        row.at,
        row.logDay,
        row.deltaSeconds,
        synced,
      )
      inserted += result.changes
    })
  })
  return inserted
}

/**
 * Rows from an imported export. No window: the export format never carried
 * one. Unsynced, so a signed-in device pushes what it imported. Returns how
 * many were new.
 */
export function insertExportedRows(rows: ExportedRow[]): number {
  return insertRows(rows, 0)
}

// --- sync --------------------------------------------------------------

/** Rows pulled from the account: already there, so marked synced. Returns how many were new. */
export function insertSyncedRows(rows: ExportedRow[]): number {
  return insertRows(rows, 1)
}

export function unsyncedEventRows(): (ExportedRow & { id: number })[] {
  return database.getAllSync<ExportedRow & { id: number }>(
    `SELECT id, kind, subject, at, log_day AS logDay, delta_seconds AS deltaSeconds
     FROM events WHERE synced = 0 ORDER BY id ASC`,
  )
}

export function markEventsSynced(ids: number[]): void {
  database.withTransactionSync(() => {
    ids.forEach((id) => {
      database.runSync('UPDATE events SET synced = 1 WHERE id = ?', id)
    })
  })
}

export function resetEventsSynced(): void {
  database.runSync('UPDATE events SET synced = 0')
}
