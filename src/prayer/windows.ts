export const WINDOW_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type WindowName = (typeof WINDOW_ORDER)[number]
export type DailyPrayerTimes = Record<WindowName, Date>

export interface PrayerWindow {
  name: WindowName
  startsAt: Date
  endsAt: Date
}

/**
 * Consecutive days are flattened into one ordered timeline, so the Isha window
 * running past midnight into the next Fajr needs no special case.
 */
export function buildWindows(days: DailyPrayerTimes[]): PrayerWindow[] {
  const boundaries = days.flatMap((day) =>
    WINDOW_ORDER.map((name) => ({ name, startsAt: day[name] })),
  )

  return boundaries
    .flatMap((boundary, index) => {
      const next = boundaries[index + 1]
      return next ? [{ ...boundary, endsAt: next.startsAt }] : []
    })
    .filter((window) => window.startsAt < window.endsAt)
}

export function windowAt(instant: Date, windows: PrayerWindow[]): PrayerWindow | null {
  return windows.find((window) => instant >= window.startsAt && instant < window.endsAt) ?? null
}
