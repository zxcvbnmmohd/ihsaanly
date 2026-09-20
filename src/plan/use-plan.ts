import { useEffect } from 'react'

import { items } from '@/content'
import { civilDateIn, shiftDays } from '@/day/boundaries'
import { toHijri } from '@/hijri/calendar'
import { useHijriOffset } from '@/hijri/store'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { runRollover, useTodayMarks } from '@/prayer/marks'
import { prayerTimesAcross } from '@/prayer/times'
import { useEventSettings } from '@/events/store'
import { useKnownItems } from '@/memorise/store'
import { currentHomeTransition } from '@/events/geofence'
import { useNotificationPreferences } from '@/notifications/store'
import { useNow } from '@/time/use-now'

import { useCompletedToday } from './completions'
import { useEnabledItems } from './enabled-store'
import { plan } from './plan'
import { useUserState } from './user-state-store'
import type { DayContext, Plan, Signals } from './signals'

const LOOK_AHEAD_DAYS = 7

function dayContextFor(
  instant: Date,
  timeZone: string,
  offsetDays: number,
  hijriOffset: number,
): DayContext {
  const civil = shiftDays(civilDateIn(instant, timeZone), offsetDays)
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay()

  return {
    civil,
    hijri: toHijri(civil, hijriOffset),
    hijriCalculated: toHijri(civil, 0),
    weekday,
  }
}

export function usePlan(): Plan | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const now = useNow()
  const userState = useUserState()
  const notifications = useNotificationPreferences()
  const enabledItemIds = useEnabledItems()
  const events = useEventSettings()
  const knownItemIds = useKnownItems()
  const prayedToday = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const completedToday = useCompletedToday(place?.timeZone ?? 'UTC', now)

  useEffect(() => {
    if (place) runRollover(place, preferences, new Date())
  }, [place, preferences])

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
    prayedToday,
    completedToday,
    activeEvents: [
      ...events.manual,
      ...(events.detectHome ? [currentHomeTransition()].filter((entry) => entry !== null) : []),
    ],
    userState,
    preferences: {
      enabledItemIds,
      knownItemIds,
      notifications,
    },
  }

  return plan(signals)
}
