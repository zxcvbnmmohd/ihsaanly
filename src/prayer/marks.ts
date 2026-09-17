import { z } from 'zod'

import { civilDateIn, civilDateKey, logDay, shiftDays, type CivilDate } from '@/day/boundaries'
import type { Place } from '@/location/place'
import {
  markedPrayersOn,
  prayerMarksOn,
  qadaCounts,
  recordEvent,
  useEventVersion,
} from '@/storage/events'
import { readPreference, writePreference } from '@/storage/preferences'

import type { CalculationPreferences } from './calculation'
import { missedPrayers, type Prayer } from './qada'
import { prayerTimesFor } from './times'
import { windowClosedAt } from './qada'

const PROCESSED_THROUGH = 'qadaProcessedThrough'
const ProcessedThrough = z.string()

function dateOf(civil: CivilDate): Date {
  return new Date(civil.year, civil.month - 1, civil.day, 12)
}

export function markPrayer(
  prayer: Prayer,
  at: Date,
  timeZone: string,
  windowStart: Date,
  windowEnd: Date,
): void {
  recordEvent({
    kind: 'prayer-performed',
    subject: prayer,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
    windowStart,
    windowEnd,
  })
}

export function unmarkPrayer(prayer: Prayer, at: Date, timeZone: string): void {
  recordEvent({
    kind: 'prayer-unmarked',
    subject: prayer,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
  })
}

export function markMadeUp(prayer: Prayer, at: Date, timeZone: string): void {
  recordEvent({
    kind: 'prayer-made-up',
    subject: prayer,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
  })
}

/**
 * Accrue misses for days that have fully passed. Nothing is backfilled before
 * the first run, so installing the app does not hand someone a debt they never
 * agreed to track.
 */
export function runRollover(place: Place, preferences: CalculationPreferences, now: Date): void {
  const yesterday = shiftDays(civilDateIn(now, place.timeZone), -1)
  const processed = readPreference(PROCESSED_THROUGH, ProcessedThrough)

  if (processed === null) {
    writePreference(PROCESSED_THROUGH, civilDateKey(yesterday))
    return
  }

  let cursor = civilDateIn(new Date(`${processed}T12:00:00Z`), 'UTC')

  while (civilDateKey(cursor) < civilDateKey(yesterday)) {
    cursor = shiftDays(cursor, 1)
    const times = prayerTimesFor(place, dateOf(cursor), preferences)
    const next = prayerTimesFor(place, dateOf(shiftDays(cursor, 1)), preferences)
    const key = civilDateKey(cursor)

    missedPrayers(times, next, markedPrayersOn(key), now).forEach((prayer) =>
      recordEvent({
        kind: 'prayer-missed',
        subject: prayer,
        at: windowClosedAt(prayer, times, next),
        logDay: key,
      }),
    )
  }

  writePreference(PROCESSED_THROUGH, civilDateKey(yesterday))
}

export function useTodayMarks(timeZone: string, now: Date): Partial<Record<Prayer, Date>> {
  useEventVersion()
  return prayerMarksOn(civilDateKey(logDay(now, timeZone)))
}

export function useQada(): Partial<Record<Prayer, number>> {
  useEventVersion()
  return qadaCounts()
}
