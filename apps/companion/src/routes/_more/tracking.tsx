import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import { checkInDate } from '@ihsaanly/core/plan/check-in'
import type { UserState } from '@ihsaanly/core/plan/user-state'
import { usePlace } from '@ihsaanly/state/location/store'
import { useOnboarding } from '@ihsaanly/state/onboarding/store'
import {
  pauseTracking,
  resumeTracking,
  setUserState,
  useUserState,
} from '@ihsaanly/state/plan/user-state-store'
import { useStrings } from '@ihsaanly/state/strings'
import { useNow } from '@ihsaanly/state/time/use-now'
import { TrackingScreen } from '@ihsaanly/ui/screens/tracking'
import { CHECK_IN_DAYS } from '@ihsaanly/ui/types'
import { createFileRoute } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/tracking')({ component: TrackingRoute })

/** What a pause would ask for: the check-in choice made before pausing. */
interface Thing {
  days: number | null
}

function dayNumber(key: string): number {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

function TrackingRoute(): ReactElement {
  const strings = useStrings()
  const userState = useUserState()
  const onboarding = useOnboarding()
  const place = usePlace()
  const now = useNow()
  const [thing, setThing] = useState<Thing>({ days: CHECK_IN_DAYS.initial })
  const timeZone = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = civilDateIn(now, timeZone)

  const pausedDays =
    userState.pauseCheckInOn == null
      ? null
      : Math.min(
          CHECK_IN_DAYS.max,
          Math.max(
            CHECK_IN_DAYS.min,
            dayNumber(userState.pauseCheckInOn) - dayNumber(civilDateKey(today)),
          ),
        )

  return (
    <>
      <PageHeader title={strings.tracking.title} />
      <TrackingScreen
        userState={userState}
        showPause={onboarding.gender !== 'male'}
        onChange={(change: Partial<UserState>) => {
          if (change.trackingPaused === true) pauseTracking({ checkInDays: thing.days })
          else if (change.trackingPaused === false) resumeTracking()
          else setUserState({ ...userState, ...change })
        }}
        checkInDays={userState.trackingPaused ? pausedDays : thing.days}
        onCheckInDays={(days) => {
          setThing({ days })
          if (userState.trackingPaused) {
            setUserState({
              ...userState,
              pauseCheckInOn: days === null ? null : checkInDate(today, days),
            })
          }
        }}
      />
    </>
  )
}
