import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, type PrayerWindow, windowAt } from '@ihsaanly/core/prayer/windows'
import { usePlace } from '../location/store'
import { useNow } from '../time/use-now'
import { useCalculationPreferences } from './store'

export function useCurrentWindow(): PrayerWindow | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()

  if (!place) return null

  return windowAt(now, buildWindows(prayerTimesAcross(place, now, preferences)))
}
