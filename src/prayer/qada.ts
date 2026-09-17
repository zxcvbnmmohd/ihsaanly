import type { DailyPrayerTimes, WindowName } from './windows'

export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export const PRAYERS: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

/** The window a prayer occupies ends when the next boundary arrives. */
const CLOSES_AT: Record<Prayer, WindowName> = {
  fajr: 'sunrise',
  dhuhr: 'asr',
  asr: 'maghrib',
  maghrib: 'isha',
  isha: 'fajr',
}

export function windowClosedAt(
  prayer: Prayer,
  today: DailyPrayerTimes,
  tomorrow: DailyPrayerTimes,
): Date {
  // Isha runs past midnight, so its window closes at the next day's Fajr.
  return prayer === 'isha' ? tomorrow.fajr : today[CLOSES_AT[prayer]]
}

/**
 * A prayer counts as missed once its window has closed and no mark exists.
 * An open window is not a miss — it is simply not done yet, which is why
 * nothing accrues until the moment passes.
 */
export function missedPrayers(
  today: DailyPrayerTimes,
  tomorrow: DailyPrayerTimes,
  marked: Prayer[],
  asOf: Date,
): Prayer[] {
  return PRAYERS.filter(
    (prayer) => !marked.includes(prayer) && windowClosedAt(prayer, today, tomorrow) <= asOf,
  )
}
