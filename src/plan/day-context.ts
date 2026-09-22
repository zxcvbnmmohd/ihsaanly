import { civilDateIn, hijriDay, shiftDays } from '@/day/boundaries'
import { toHijri } from '@/hijri/calendar'

import type { DayContext } from './signals'

/**
 * The two boundaries, kept apart. `civil` is the local calendar day and governs
 * the prayer log. The Hijri date turns at Maghrib instead, so after sunset today
 * already carries tomorrow's Hijri date — which is what the Hijri screen has
 * always shown, and what Today used to contradict by deriving both from the
 * calendar day.
 *
 * Only today has a Maghrib to compare against. A day in the look-ahead is asked
 * about as a whole, so its Hijri date is the one its daytime carries.
 */
export function dayContextFor(
  instant: Date,
  timeZone: string,
  offsetDays: number,
  hijriOffset: number,
  maghrib: Date | null,
): DayContext {
  const civil = shiftDays(civilDateIn(instant, timeZone), offsetDays)
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay()
  const hijriCivil = maghrib && offsetDays === 0 ? hijriDay(instant, maghrib, timeZone) : civil

  return {
    civil,
    hijri: toHijri(hijriCivil, hijriOffset),
    hijriCalculated: toHijri(hijriCivil, 0),
    weekday,
  }
}
