import type * as SQLite from 'expo-sqlite'

export const MIGRATIONS = [
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
  // Sync. An event's identity is kind, subject and instant — the same key
  // import already dedupes on — so it becomes unique here and every device
  // agrees on what "the same fact" means. `synced` marks what has been pushed;
  // `updated_at` stamps each preference so the newer one wins a merge.
  //
  // Batches (several made up at once) used to share one instant. Rather than
  // collapse them, which would erase real make-ups, each repeat is nudged
  // forward by its rank in milliseconds; recording now does the same. The
  // delete after it only catches a nudge that lands on another row exactly,
  // which the unique index would otherwise refuse, bricking the database.
  `ALTER TABLE events ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
   CREATE TEMP TABLE event_rank AS
     SELECT id, ROW_NUMBER() OVER (PARTITION BY kind, subject, at ORDER BY id) - 1 AS rank
     FROM events;
   UPDATE events SET at = at + (SELECT rank FROM event_rank WHERE event_rank.id = events.id)
   WHERE id IN (SELECT id FROM event_rank WHERE rank > 0);
   DROP TABLE event_rank;
   DELETE FROM events WHERE id NOT IN (
     SELECT MIN(id) FROM events GROUP BY kind, subject, at
   );
   CREATE UNIQUE INDEX events_identity ON events (kind, subject, at);
   ALTER TABLE preferences ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
  // Content downloaded for the next open (state/content). Apart from
  // `preferences` on purpose: it is public, replaceable, never synced or
  // exported, and survives a wipe of the user's own data.
  `CREATE TABLE content_cache (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   ) STRICT;`,
]

export function migrate(connection: SQLite.SQLiteDatabase): void {
  const result = connection.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const applied = result?.user_version ?? 0

  // One transaction per migration, version bump included: a migration that
  // fails halfway would otherwise leave its first statements applied and the
  // version unmoved, so the next launch replays it and fails for good.
  MIGRATIONS.slice(applied).forEach((migration, offset) => {
    connection.withTransactionSync(() => {
      connection.execSync(migration)
      connection.execSync(`PRAGMA user_version = ${applied + offset + 1}`)
    })
  })
}
