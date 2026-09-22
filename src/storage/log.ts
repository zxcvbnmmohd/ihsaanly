import { appended, entryFor, FailureLog, type FailureEntry } from './failure-entry'
import { readPreference, writePreference } from './preferences'

const KEY = 'failureLog'

export type { FailureEntry }

/**
 * The failures the user never saw, kept across launches.
 *
 * `lastStorageError()` holds one, which answers "is something wrong now" and
 * nothing about the failure an hour ago that the person is actually reporting.
 * This is the rotating log issue #18 asks for, and it rides along in the
 * diagnostic bundle.
 *
 * ponytail: a capped array in the preferences table rather than a real log
 * file. `writePreference` is a synchronous SQLite write, so it can be called
 * from inside a catch block, which a file write cannot. Move to a file if the
 * entries ever need to outgrow one row.
 */
let cached: FailureEntry[] | null = null

function read(): FailureEntry[] {
  cached ??= readPreference(KEY, FailureLog) ?? []
  return cached
}

export function appendFailure(label: string, error: unknown): void {
  const next = appended(read(), entryFor(label, error, new Date()))
  cached = next

  try {
    writePreference(KEY, next)
  } catch {
    // The log is what records failures; it must not become one. The in-memory
    // copy still reaches this session's diagnostic bundle.
  }
}

export function recentFailures(): FailureEntry[] {
  return read()
}
