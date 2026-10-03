import { type CivilDate, civilDateKey, shiftDays } from '../day/boundaries'

import type { UserState } from './user-state'

/** "Remind me in about N days": the range offered, and where it starts. */
export const CHECK_IN_DAYS = { min: 3, max: 10, default: 7 } as const

/** The local hour the check-in arrives: mid-morning, clear of the default quiet hours. */
export const CHECK_IN_HOUR = 10

/** The day `days` after `today`, with `days` held to the offered range. */
export function checkInDate(today: CivilDate, days: number): string {
  const clamped = Math.min(CHECK_IN_DAYS.max, Math.max(CHECK_IN_DAYS.min, Math.round(days)))
  return civilDateKey(shiftDays(today, clamped))
}

/** Paused, with a check-in set for today or a day already gone. */
export function isCheckInDue(state: UserState, today: CivilDate): boolean {
  const on = state.pauseCheckInOn ?? null
  return state.trackingPaused && on !== null && civilDateKey(today) >= on
}

/** The wall clock of `instant` in `timeZone`, read as if it were UTC. */
function wallClock(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value)
  return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'))
}

/**
 * The instant of CHECK_IN_HOUR on the day `on` (YYYY-MM-DD) in `timeZone`.
 * Not from prayer times, so a check-in ten days out lands past the prayer
 * horizon too.
 */
export function checkInAt(on: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = on.split('-').map(Number)
  const guess = Date.UTC(year, month - 1, day, CHECK_IN_HOUR)
  return new Date(guess - (wallClock(new Date(guess), timeZone) - guess))
}
