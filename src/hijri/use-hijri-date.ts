import { hijriDay } from '@/day/boundaries'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesFor } from '@/prayer/times'
import { useNow } from '@/time/use-now'

import { toHijri, type HijriDate } from './calendar'
import { useHijriOffset } from './store'

export function useHijriDate(): HijriDate | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const offset = useHijriOffset()
  const now = useNow()

  if (!place) return null

  const { maghrib } = prayerTimesFor(place, now, preferences)
  return toHijri(hijriDay(now, maghrib, place.timezone), offset)
}
