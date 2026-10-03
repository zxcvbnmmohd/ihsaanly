import { appended, entryFor, type FailureEntry, FailureLog } from './failure-entry'
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
  if (cached) return cached
  // Called from inside catch blocks, and storage is often why they ran: an
  // unreadable log is an empty one for now, and is tried again on the next call.
  try {
    cached = readPreference(KEY, FailureLog) ?? []
  } catch {
    return []
  }
  return cached
}

/**
 * Forgets the copy held in memory, so the next read goes back to storage. For a
 * wipe done in place: without it the failures just erased would reappear in
 * the next diagnostic bundle and be written back by the next failure.
 */
export function forgetFailures(): void {
  cached = null
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
