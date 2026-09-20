import { z } from 'zod'

import { civilDateIn, civilDateKey, logDay, shiftDays, type CivilDate } from '@/day/boundaries'
import type { Place } from '@/location/place'
import {
  markedPrayersOn,
  recordEvent,
  recordEvents,
  useMarksOn,
  useQadaCounts,
} from '@/storage/events'
import { readPreference, writePreference } from '@/storage/preferences'

import type { CalculationPreferences } from './calculation'
import { useQadaBacklog } from './backlog-store'
import { missedPrayers, outstanding, type Prayer } from './qada'
import { prayerTimesFor } from './times'
import { windowClosedAt } from './qada'

const PROCESSED_THROUGH = 'qadaProcessedThrough'
const ProcessedThrough = z.string()

function dateOf(civil: CivilDate): Date {
  return new Date(civil.year, civil.month - 1, civil.day, 12)
}

/**
 * The window is optional and only feeds the timing metric. A mark is the
 * user's statement that they prayed; nothing about our arithmetic should be
 * able to refuse it.
 */
export function markPrayer(
  prayer: Prayer,
  at: Date,
  timeZone: string,
  window?: { startsAt: Date; endsAt: Date },
): void {
  recordEvent({
    kind: 'prayer-performed',
    subject: prayer,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
    windowStart: window?.startsAt,
    windowEnd: window?.endsAt,
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

/** Several made up at once, for someone paying down a backlog. */
export function markMadeUpMany(prayer: Prayer, count: number, at: Date, timeZone: string): void {
  const key = civilDateKey(logDay(at, timeZone))
  recordEvents(
    Array.from({ length: count }, () => ({
      kind: 'prayer-made-up' as const,
      subject: prayer,
      at,
      logDay: key,
    })),
  )
}

/**
 * Accrue misses for days that have fully passed. Nothing is backfilled before
 * the first run, so installing the app does not hand someone a debt they never
 * agreed to track.
 */
function rollover(
  place: Place,
  preferences: CalculationPreferences,
  now: Date,
  paused: boolean,
): void {
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

    // While tracking is paused nothing is owed, so the days pass unrecorded
    // and the cursor still advances: resuming never backfills them.
    if (paused) continue

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
  return useMarksOn(civilDateKey(logDay(now, timeZone)))
}

export function useQada(): Partial<Record<Prayer, number>> {
  return outstanding(useQadaCounts(), useQadaBacklog())
}

/** A failure here must never stop the app rendering. */
export function runRollover(
  place: Place,
  preferences: CalculationPreferences,
  now: Date,
  paused = false,
): void {
  try {
    rollover(place, preferences, now, paused)
  } catch (error) {
    console.warn('rollover failed', error)
  }
}
