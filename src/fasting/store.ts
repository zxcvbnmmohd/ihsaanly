import { z } from 'zod'

import { civilDateKey, logDay } from '@/day/boundaries'
import { recordEvent, recordEvents, useFastLedger } from '@/storage/events'
import { createPreferenceStore } from '@/storage/preference-store'

import { FAST_MADE_UP, FAST_OWED, FAST_OWED_CLEARED, fastsOutstanding } from './ledger'

/**
 * Fasts owed from before the app started tracking. A count, never a list of
 * dates, like the prayer backlog.
 */
const Backlog = z.number().int().min(0)

const backlog = createPreferenceStore<number>('fastBacklog', Backlog, 0)

export const useFastBacklog = backlog.use

export function setFastBacklog(count: number): void {
  backlog.set(Math.max(0, count))
}

/** Every fasting event shares one subject; the kind and the day carry the meaning. */
const SUBJECT = 'fast'

/**
 * Recording an owed fast is the user's own act, so it is written whether or
 * not tracking is paused: the pause stops what the app infers, never what the
 * user tells it. The spec asks for exactly this.
 */
export function recordFastOwed(at: Date, timeZone: string): void {
  recordEvent({
    kind: FAST_OWED,
    subject: SUBJECT,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
  })
}

/** Takes back today's record. Nothing is deleted; the later fact supersedes it. */
export function clearFastOwed(at: Date, timeZone: string): void {
  recordEvent({
    kind: FAST_OWED_CLEARED,
    subject: SUBJECT,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
  })
}

export function recordFastsMadeUp(count: number, at: Date, timeZone: string): void {
  const key = civilDateKey(logDay(at, timeZone))
  recordEvents(
    Array.from({ length: count }, () => ({
      kind: FAST_MADE_UP,
      subject: SUBJECT,
      at,
      logDay: key,
    })),
  )
}

export function useFastsOutstanding(): number {
  return fastsOutstanding(useFastLedger(), useFastBacklog())
}

export function useFastOwedOn(day: string): boolean {
  return useFastLedger().owedDays.includes(day)
}
