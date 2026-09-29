import type { ZodType } from 'zod'

import { database } from './database'

export function readPreference<T>(key: string, schema: ZodType<T>): T | null {
  const row = database.getFirstSync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    key,
  )

  if (!row) return null

  // A half-written or hand-edited row throws rather than failing validation, and
  // this is read while the first screen is still being built, so an unguarded
  // parse is a blank launch. An unreadable preference simply falls back to its
  // default, which is what a missing row already does.
  try {
    const parsed = schema.safeParse(JSON.parse(row.value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writePreference<T>(key: string, value: T): void {
  database.runSync(
    'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  )
}
