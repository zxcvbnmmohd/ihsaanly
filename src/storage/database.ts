import * as SQLite from 'expo-sqlite'
import { Paths } from 'expo-file-system'

const APP_GROUP = 'group.com.ihsaanly.app'

/**
 * The single switch. Widgets run in a separate process and can only read a
 * shared container, which needs an Apple Developer Program membership (#16).
 * Until that exists, storage is app-local.
 */
const SHARED_CONTAINER_ENABLED = false

const MIGRATIONS = [
  `CREATE TABLE preferences (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   ) STRICT;`,
  // Append-only. Nothing here is ever updated or deleted, so the record stays
  // auditable and a make-up is a new fact rather than an erased one.
  `CREATE TABLE events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     kind TEXT NOT NULL,
     subject TEXT NOT NULL,
     at INTEGER NOT NULL,
     log_day TEXT NOT NULL,
     window_start INTEGER,
     window_end INTEGER,
     delta_seconds INTEGER
   );
   CREATE INDEX events_log_day ON events (log_day);
   CREATE INDEX events_kind ON events (kind);`,
]

function databaseDirectory(): string | undefined {
  if (!SHARED_CONTAINER_ENABLED) return undefined
  return Paths.appleSharedContainers[APP_GROUP]?.uri
}

function migrate(connection: SQLite.SQLiteDatabase): void {
  const result = connection.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const applied = result?.user_version ?? 0

  MIGRATIONS.slice(applied).forEach((migration, offset) => {
    connection.execSync(migration)
    connection.execSync(`PRAGMA user_version = ${applied + offset + 1}`)
  })
}

export const database = SQLite.openDatabaseSync('ihsaanly.db', undefined, databaseDirectory())

migrate(database)

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
