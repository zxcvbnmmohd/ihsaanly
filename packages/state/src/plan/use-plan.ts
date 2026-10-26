import { items } from '@ihsaanly/core/content'
import { ownDuaItems } from '@ihsaanly/core/content/my-duas'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { attendsJumuah } from '@ihsaanly/core/plan/jumuah'
import { plan } from '@ihsaanly/core/plan/plan'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { prayerTimesAcross, prayerTimesFor } from '@ihsaanly/core/prayer/times'
import { useEffect } from 'react'
import { currentHomeTransition } from '../events/home-transition'
import { useEventSettings } from '../events/store'
import { useHijriOffset } from '../hijri/store'
import { usePlace } from '../location/store'
import { useKnownItems } from '../memorise/store'
import { useOwnDuas } from '../my-duas/store'
import { useNotificationPreferences } from '../notifications/store'
import { useOnboarding } from '../onboarding/store'
import { runRollover, useTodayMarks } from '../prayer/marks'
import { useCalculationPreferences } from '../prayer/store'
import { useNow } from '../time/use-now'
import { useCompletedToday } from './completions'
import { useEnabledItems } from './enabled-store'
import { useUserState } from './user-state-store'

const LOOK_AHEAD_DAYS = 7

/**
 * Prayer times from yesterday to the end of the look-ahead. Reminders are
 * scheduled from these, so this is how long they survive without the app
 * being opened; three days was the old default and reminders stopped after a
 * weekend away.
 */
const HORIZON_DAYS = LOOK_AHEAD_DAYS + 1

export function useSignals(): Signals | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const now = useNow()
  const userState = useUserState()
  const onboarding = useOnboarding()
  const notifications = useNotificationPreferences()
  const enabledItemIds = useEnabledItems()
  const events = useEventSettings()
  const knownItemIds = useKnownItems()
  const prayedToday = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const completedToday = useCompletedToday(place?.timeZone ?? 'UTC', now)
  const ownDuas = useOwnDuas()

  useEffect(() => {
    if (place) runRollover(place, preferences, new Date(), userState.trackingPaused)
  }, [place, preferences, userState.trackingPaused])

  if (!place) return null

  const { maghrib } = prayerTimesFor(place, now, preferences)

  // An own dua with a moment is on Today at that moment, and the moment is
  // the reminder the user asked for: its own per-item yes, which still goes
  // through quiet hours and the daily cap like every other item reminder.
  const personal = ownDuaItems(ownDuas)
  const personalIds = personal.map((item) => item.id)

  const signals: Signals = {
    now,
    timeZone: place.timeZone,
    items: [...items, ...personal],
    prayerTimes: prayerTimesAcross(place, now, preferences, HORIZON_DAYS),
    today: dayContextFor(now, place.timeZone, 0, hijriOffset, maghrib),
    upcoming: Array.from({ length: LOOK_AHEAD_DAYS }, (_, index) =>
      dayContextFor(now, place.timeZone, index + 1, hijriOffset, null),
    ),
    prayedToday,
    completedToday,
    activeEvents: [
      ...events.manual,
      ...(events.detectHome ? [currentHomeTransition()].filter((entry) => entry !== null) : []),
    ],
    userState,
    // Resolved here so the planner decides Friday without ever seeing gender.
    attendsJumuah: attendsJumuah(userState.jumuah, userState.travelling, onboarding.gender),
    preferences: {
      enabledItemIds: [...enabledItemIds, ...personalIds],
      knownItemIds,
      notifications: {
        ...notifications,
        perItem: {
          ...notifications.perItem,
          ...Object.fromEntries(personalIds.map((id) => [id, true])),
        },
      },
    },
  }

  return signals
}

export function usePlan(): Plan | null {
  const signals = useSignals()
  return signals ? plan(signals) : null
}
