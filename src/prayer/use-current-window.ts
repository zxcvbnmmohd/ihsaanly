import { usePlace } from '@/location/store'
import { useNow } from '@/time/use-now'

import { useCalculationPreferences } from './store'
import { prayerTimesAcross } from './times'
import { buildWindows, windowAt, type PrayerWindow } from './windows'

export function useCurrentWindow(): PrayerWindow | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()

  if (!place) return null

  return windowAt(now, buildWindows(prayerTimesAcross(place, now, preferences)))
}
