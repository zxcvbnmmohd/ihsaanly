import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
} from 'adhan'

import type { Place } from '@/location/place'

import type { CalculationPreferences } from './calculation'
import { WINDOW_ORDER, type DailyPrayerTimes } from './windows'

const MADHAB = { shafi: Madhab.Shafi, hanafi: Madhab.Hanafi } as const

const HIGH_LATITUDE_RULE = {
  middleofthenight: HighLatitudeRule.MiddleOfTheNight,
  seventhofthenight: HighLatitudeRule.SeventhOfTheNight,
  twilightangle: HighLatitudeRule.TwilightAngle,
} as const

function parametersFrom(preferences: CalculationPreferences): CalculationParameters {
  const parameters = CalculationMethod[preferences.method]()
  parameters.madhab = MADHAB[preferences.asr]
  parameters.highLatitudeRule = HIGH_LATITUDE_RULE[preferences.highLatitudeRule]
  // Inside the polar circle the high-latitude rule alone still yields NaN,
  // because the boundary events never occur. Nearest-day is a fallback rather
  // than a ruling, and is one for the content reviewer to confirm.
  parameters.polarCircleResolution = PolarCircleResolution.AqrabYaum
  return parameters
}

export function prayerTimesFor(
  place: Place,
  date: Date,
  preferences: CalculationPreferences,
): DailyPrayerTimes {
  const times = new PrayerTimes(
    new Coordinates(place.latitude, place.longitude),
    date,
    parametersFrom(preferences),
  )

  return Object.fromEntries(WINDOW_ORDER.map((name) => [name, times[name]])) as DailyPrayerTimes
}

export function prayerTimesAcross(
  place: Place,
  date: Date,
  preferences: CalculationPreferences,
  days = 3,
): DailyPrayerTimes[] {
  return Array.from({ length: days }, (_, offset) => {
    const day = new Date(date)
    day.setDate(day.getDate() + offset - 1)
    return prayerTimesFor(place, day, preferences)
  })
}
