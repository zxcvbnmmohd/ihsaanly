import { Database } from 'bun:sqlite'
import { expect, it } from 'bun:test'
import type * as SQLite from 'expo-sqlite'

import { MIGRATIONS, migrate } from './migrations'

/** Just the three calls `migrate` makes, over bun's SQLite. */
function connection(db: Database): SQLite.SQLiteDatabase {
  return {
    getFirstSync: (sql: string) => db.query(sql).get(),
    execSync: (sql: string) => db.exec(sql),
    withTransactionSync: (work: () => void) => db.transaction(work)(),
  } as unknown as SQLite.SQLiteDatabase
}

it('migrates a pre-sync database without losing a batch that shared an instant', () => {
  const db = new Database(':memory:')
  MIGRATIONS.slice(0, 2).forEach((migration) => db.exec(migration))
  db.exec('PRAGMA user_version = 2')
  db.exec(`INSERT INTO preferences (key, value) VALUES ('locale', '"en"')`)
  db.exec(`INSERT INTO events (kind, subject, at, log_day) VALUES
    ('prayer-made-up', 'fajr', 1000, '2026-09-22'),
    ('prayer-made-up', 'fajr', 1000, '2026-09-22'),
    ('prayer-made-up', 'fajr', 1000, '2026-09-22'),
    ('prayer-made-up', 'fajr', 1001, '2026-09-22'),
    ('prayer-performed', 'fajr', 1000, '2026-09-22')`)

  migrate(connection(db))

  // The batch of three is nudged to 1000, 1001, 1002; the nudge that landed
  // on the separate 1001 row is the one casualty.
  expect(db.query(`SELECT at FROM events WHERE kind = 'prayer-made-up' ORDER BY at`).all()).toEqual(
    [{ at: 1000 }, { at: 1001 }, { at: 1002 }],
  )
  expect(db.query('SELECT COUNT(*) AS n FROM events WHERE synced = 0').get()).toEqual({ n: 4 })
  expect(db.query('SELECT updated_at AS t FROM preferences').get()).toEqual({ t: 0 })
  expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: MIGRATIONS.length })
  expect(() =>
    db.exec(
      `INSERT INTO events (kind, subject, at, log_day) VALUES ('prayer-performed', 'fajr', 1000, 'x')`,
    ),
  ).toThrow()
})

it('migrates a fresh database from nothing', () => {
  const db = new Database(':memory:')
  migrate(connection(db))
  expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: MIGRATIONS.length })
})
