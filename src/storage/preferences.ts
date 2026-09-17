import type { ZodType } from 'zod'

import { database } from './database'

export function readPreference<T>(key: string, schema: ZodType<T>): T | null {
  const row = database.getFirstSync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    key,
  )

  if (!row) return null

  const parsed = schema.safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : null
}

export function writePreference<T>(key: string, value: T): void {
  database.runSync(
    'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  )
}
