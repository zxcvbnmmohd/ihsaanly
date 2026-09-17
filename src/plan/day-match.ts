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
      return hijri.month === MUHARRAM && hijri.day === 10
    case 'arafah':
      return hijri.month === DHUL_HIJJAH && hijri.day === 9
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
