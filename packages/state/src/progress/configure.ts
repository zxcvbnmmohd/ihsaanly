import { itemById } from '@ihsaanly/core/content'
import { civilDateKey, logDay } from '@ihsaanly/core/day/boundaries'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, type PrayerWindow, windowAt } from '@ihsaanly/core/prayer/windows'
import { getPlace } from '../location/store'
import { getCalculationPreferences } from '../prayer/store'
import { periodKeyFor } from './model'
import { configureProgress, type ProgressContext } from './store'

const deviceZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * The prayer window `at` falls in, for the saved place. Prayer times are worked
 * out once a minute at most: Today reads every row's period on each render.
 */
function windowFor(at: Date): PrayerWindow | null {
  const place = getPlace()
  if (!place) return null
  const preferences = getCalculationPreferences()
  const minute = Math.floor(at.getTime() / 60_000)
  if (cached.place !== place || cached.preferences !== preferences || cached.minute !== minute) {
    cached = {
      place,
      preferences,
      minute,
      window: windowAt(at, buildWindows(prayerTimesAcross(place, at, preferences))),
    }
  }
  return cached.window
}

let cached: {
  place: unknown
  preferences: unknown
  minute: number
  window: PrayerWindow | null
} = { place: null, preferences: null, minute: -1, window: null }

/**
 * The app's progress periods: the item's trigger, today's log day in the
 * saved place's zone, and the prayer window now, so the morning adhkar reset
 * with the morning and the tasbih after each prayer. `now` is read each time
 * so a test (or a page with a faked clock) moves it.
 */
export function appProgressContext(now: () => Date = () => new Date()): ProgressContext {
  const timeZone = (): string => getPlace()?.timeZone ?? deviceZone()
  return {
    now,
    timeZone,
    periodOf: (itemId) => {
      const at = now()
      const day = civilDateKey(logDay(at, timeZone()))
      const item = itemById(itemId)
      if (!item) return `${day}:day`
      return periodKeyFor(item.trigger, day, windowFor(at)?.name ?? null)
    },
    windowOf: () => {
      const window = windowFor(now())
      return window ? { startsAt: window.startsAt, endsAt: window.endsAt } : undefined
    },
  }
}

/** Called once at startup by each app. Returns the reset, for tests. */
export function startProgress(now?: () => Date): () => void {
  return configureProgress(appProgressContext(now))
}
