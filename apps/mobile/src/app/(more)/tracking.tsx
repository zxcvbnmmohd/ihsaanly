import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import type { UserState } from '@ihsaanly/core/plan/user-state'
import { getPlace } from '@ihsaanly/state/location/store'
import { useOnboarding } from '@ihsaanly/state/onboarding/store'
import {
  pauseTracking,
  resumeTracking,
  setUserState,
  useUserState,
} from '@ihsaanly/state/plan/user-state-store'
import { useNow } from '@ihsaanly/state/time/use-now'
import { TrackingScreen } from '@ihsaanly/ui/screens/tracking'
import { CHECK_IN_DAYS } from '@ihsaanly/ui/types'
import { type ReactElement, useState } from 'react'

interface Thing {
  /** The choice made before pausing; while paused the stored date is the truth. */
  days: number | null
}

const DAY_MS = 86_400_000

export default function TrackingRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ days: CHECK_IN_DAYS.initial })
  const userState = useUserState()
  const onboarding = useOnboarding()
  const now = useNow()

  const timeZone = getPlace()?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const clamp = (days: number): number =>
    Math.min(CHECK_IN_DAYS.max, Math.max(CHECK_IN_DAYS.min, days))
  const daysUntil = (on: string): number => {
    const today = Date.parse(`${civilDateKey(civilDateIn(now, timeZone))}T00:00:00Z`)
    return clamp(Math.round((Date.parse(`${on}T00:00:00Z`) - today) / DAY_MS))
  }
  const checkInDays = userState.trackingPaused
    ? userState.pauseCheckInOn
      ? daysUntil(userState.pauseCheckInOn)
      : null
    : thing.days

  return (
    <TrackingScreen
      userState={userState}
      // Offered unless it is known not to apply, so declining to answer costs nothing.
      showPause={onboarding.gender !== 'male'}
      checkInDays={checkInDays}
      onCheckInDays={(days) => {
        setThing({ days })
        if (userState.trackingPaused) pauseTracking({ checkInDays: days })
      }}
      onChange={(change: Partial<UserState>) => {
        if (change.trackingPaused === true) {
          pauseTracking({ checkInDays: thing.days })
          return
        }
        if (change.trackingPaused === false) {
          resumeTracking()
          return
        }
        setUserState({ ...userState, ...change })
      }}
    />
  )
}
