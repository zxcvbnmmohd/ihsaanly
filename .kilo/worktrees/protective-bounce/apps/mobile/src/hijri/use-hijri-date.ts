import { hijriDay } from '@ihsaanly/core/day/boundaries'
import { type HijriDate, toHijri } from '@ihsaanly/core/hijri/calendar'
import { prayerTimesFor } from '@ihsaanly/core/prayer/times'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { useNow } from '@/time/use-now'
import { useHijriOffset } from './store'

export function useHijriDate(): HijriDate | null {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const offset = useHijriOffset()
  const now = useNow()

  if (!place) return null

  const { maghrib } = prayerTimesFor(place, now, preferences)
  return toHijri(hijriDay(now, maghrib, place.timeZone), offset)
}
