import { items } from '@/content'
import { civilDateIn, shiftDays } from '@/day/boundaries'
import { toHijri } from '@/hijri/calendar'
import { useHijriOffset } from '@/hijri/store'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { useNow } from '@/time/use-now'

import { plan } from './plan'
import type { DayContext, Plan, Signals } from './signals'

const LOOK_AHEAD_DAYS = 7
const DEFAULT_NOTIFICATIONS_PER_DAY = 3

function dayContextFor(
  instant: Date,
  timeZone: string,
  offsetDays: number,
  hijriOffset: number,
): DayContext {
  const civil = shiftDays(civilDateIn(instant, timeZone), offsetDays)
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay()

  return { civil, hijri: toHijri(civil, hijriOffset), weekday }
}

export function usePlan(): Plan | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const now = useNow()

  if (!place) return null

  const signals: Signals = {
    now,
    timeZone: place.timeZone,
    items,
    prayerTimes: prayerTimesAcross(place, now, preferences),
    today: dayContextFor(now, place.timeZone, 0, hijriOffset),
    upcoming: Array.from({ length: LOOK_AHEAD_DAYS }, (_, index) =>
      dayContextFor(now, place.timeZone, index + 1, hijriOffset),
    ),
    // Marking prayers lands in #9, contextual events in #15, the manual
    // switches in #10 and the enabled set in #13.
    prayedToday: {},
    activeEvents: [],
    userState: { travelling: false, trackingPaused: false },
    preferences: {
      enabledItemIds: items.filter((item) => item.defaultOn).map((item) => item.id),
      knownItemIds: [],
      maxNotificationsPerDay: DEFAULT_NOTIFICATIONS_PER_DAY,
    },
  }

  return plan(signals)
}
