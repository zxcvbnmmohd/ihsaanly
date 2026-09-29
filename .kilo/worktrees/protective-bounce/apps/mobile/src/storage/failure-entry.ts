import { z } from 'zod'

/** Enough to see a pattern, small enough to sit in one preferences row. */
export const CAPACITY = 50

/** A stack is for reproducing, not for reading. Past this it is noise. */
export const STACK_LIMIT = 600

export const FailureEntry = z.object({
  at: z.string(),
  label: z.string(),
  message: z.string(),
  stack: z.string().nullable(),
})

export const FailureLog = z.array(FailureEntry)

export type FailureEntry = z.infer<typeof FailureEntry>

/**
 * Kept apart from the store so it can be tested without a database. What is
 * thrown is not always an Error, and a stack is worth having but not worth
 * carrying whole.
 */
export function entryFor(label: string, error: unknown, now: Date): FailureEntry {
  return {
    at: now.toISOString(),
    label,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error && error.stack ? error.stack.slice(0, STACK_LIMIT) : null,
  }
}

/** Oldest entries fall off the front. This is the rotating part. */
export function appended(existing: FailureEntry[], entry: FailureEntry): FailureEntry[] {
  return [...existing, entry].slice(-CAPACITY)
}
