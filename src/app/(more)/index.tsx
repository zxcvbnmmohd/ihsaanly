import type { ReactElement } from 'react'
import { useHijriOffset } from '@/hijri/store'
import { useUserState } from '@/plan/user-state-store'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { MoreScreen } from '@/screens/more'
import { strings } from '@/strings'

export default function MoreRoute(): ReactElement {
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const userState = useUserState()

  const tracking = [
    userState.travelling ? strings.tracking.travelling : null,
    userState.trackingPaused ? strings.tracking.paused : null,
  ].filter(Boolean)

  return (
    <MoreScreen
      locationHref="/location"
      locationLabel={place?.label ?? strings.location.notSet}
      calculationHref="/calculation"
      calculationLabel={strings.asr[calculation.asr]}
      hijriHref="/hijri"
      hijriLabel={strings.hijri.offsetLabel(hijriOffset)}
      trackingHref="/tracking"
      moonSightingHref="/moon-sighting"
      notificationsHref="/notifications"
      eventsHref="/events"
      trackingLabel={tracking.length > 0 ? tracking.join(', ') : strings.tracking.title}
    />
  )
}
