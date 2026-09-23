import type { CivilDate } from '@/day/boundaries'
import { toHijri } from '@/hijri/calendar'
import { assertNever } from '@/assert-never'

/**
 * The owed-fasts ledger, v1. Deliberately narrow until the content reviewer
 * confirms it:
 *
 * - Only obligatory fasts are owed, and v1 knows one kind: a Ramadan day the
 *   user says they did not fast, plus a carried-over backlog the user sets.
 *   Voluntary fasts (Monday, the White Days, Arafah…) are never owed.
 * - Nothing accrues automatically. The user records each owed day, so
 *   recording is an explicit act — and that is why the tracking pause does
 *   not stop it: the spec asks that owed fasts are still recorded while
 *   paused, and a pause only suspends what the app would infer on its own.
 * - Vows, expiations and fidya are out of scope.
 * - A count, never a dated list, like prayer qada.
 */

/** Recorded against the civil day: "I am not fasting today". */
export const FAST_OWED = 'fast-owed'
/** Takes back that day's record, like `prayer-unmarked` does for a mark. */
export const FAST_OWED_CLEARED = 'fast-owed-cleared'
/** One owed fast made up. */
export const FAST_MADE_UP = 'fast-made-up'

export type FastEventKind = typeof FAST_OWED | typeof FAST_OWED_CLEARED | typeof FAST_MADE_UP

export interface FastEvent {
  kind: FastEventKind
  logDay: string
}

export interface FastLedger {
  /** Civil days (`YYYY-MM-DD`) currently recorded as owed. */
  owedDays: string[]
  /** How many owed fasts have been made up, all time. */
  madeUp: number
}

export const RAMADAN = 9

/**
 * Folds the events, oldest first, into the days owed and the count made up.
 * The latest of an owed/cleared pair on a day wins, so an undo supersedes the
 * record without deleting it.
 */
export function readLedger(events: FastEvent[]): FastLedger {
  const owed = new Set<string>()
  let madeUp = 0

  events.forEach((event): void => {
    switch (event.kind) {
      case FAST_OWED:
        owed.add(event.logDay)
        return
      case FAST_OWED_CLEARED:
        owed.delete(event.logDay)
        return
      case FAST_MADE_UP:
        madeUp += 1
        return
      default:
        return assertNever(event.kind)
    }
  })

  return { owedDays: [...owed].sort(), madeUp }
}

/**
 * What is still owed: recorded less made up, plus what was owed from before,
 * never below zero. The same shape as `outstanding` in prayer/qada.ts; the raw
 * net may go negative while a backlog is paid down, and the clamp lives here,
 * next to the addition.
 */
export function fastsOutstanding(ledger: FastLedger, backlog: number): number {
  return Math.max(0, ledger.owedDays.length - ledger.madeUp + backlog)
}

/**
 * Whether the fasting day on this civil date falls in Ramadan. The civil date
 * and not the Maghrib-shifted Hijri day: after Maghrib the Hijri date has
 * turned, but the fast being asked about is the one that day's daylight held.
 */
export function isRamadanDay(civil: CivilDate, hijriOffset: number): boolean {
  return toHijri(civil, hijriOffset).month === RAMADAN
}
