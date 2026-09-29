import type { ZodType } from 'zod'

import { readPreferenceRow, writePreferenceRow } from './backend'
import { noteLocalWrite } from './local-writes'

export function readPreference<T>(key: string, schema: ZodType<T>): T | null {
  const row = readPreferenceRow(key)

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
  writePreferenceRow(key, JSON.stringify(value))
  noteLocalWrite(key)
}
