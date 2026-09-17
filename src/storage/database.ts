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
