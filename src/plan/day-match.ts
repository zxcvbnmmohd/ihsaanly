import { assertNever } from '@/assert-never'
import type { Trigger } from '@/content/schema'

import type { DayContext } from './signals'

type DayTrigger = Extract<Trigger, { kind: 'day' }>['day']

const MONDAY = 1
const THURSDAY = 4
const WHITE_DAYS = [13, 14, 15]

const MUHARRAM = 1
const RAMADAN = 9
const SHAWWAL = 10
const DHUL_HIJJAH = 12

/** True when either reading lands on the date, so a divergence is never missed. */
function onEither(context: DayContext, month: number, day: number): boolean {
  return (
    (context.hijri.month === month && context.hijri.day === day) ||
    (context.hijriCalculated.month === month && context.hijriCalculated.day === day)
  )
}

/** Whether the two readings disagree about a day the app is about to name. */
export function readingsDiverge(context: DayContext): boolean {
  return (
    context.hijri.month !== context.hijriCalculated.month ||
    context.hijri.day !== context.hijriCalculated.day
  )
}

export function matchesDay(day: DayTrigger, context: DayContext): boolean {
  const { hijri, weekday } = context

  switch (day) {
    case 'monday':
      return weekday === MONDAY
    case 'thursday':
      return weekday === THURSDAY
    case 'white-days':
      return WHITE_DAYS.includes(hijri.day)
    case 'ashura':
      return onEither(context, MUHARRAM, 10)
    case 'arafah':
      // Some hold this is the ninth locally, others the day of standing in
      // Makkah. Where they differ, both are surfaced rather than one chosen.
      return onEither(context, DHUL_HIJJAH, 9)
    case 'shawwal-6':
      return hijri.month === SHAWWAL && hijri.day >= 2
    case 'dhul-hijjah':
      return hijri.month === DHUL_HIJJAH && hijri.day <= 10
    case 'ramadan':
      return hijri.month === RAMADAN
    default:
      return assertNever(day)
  }
}
