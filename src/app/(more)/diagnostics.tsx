import type { ReactElement } from 'react'

import { civilDateKey, logDay } from '@/day/boundaries'
import { usePlace } from '@/location/store'
import { markPrayer, useTodayMarks } from '@/prayer/marks'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows, windowAt } from '@/prayer/windows'
import { DiagnosticsScreen } from '@/screens/diagnostics'
import {
  eventCount,
  lastStorageError,
  recentEvents,
  schemaVersion,
  useEventVersion,
} from '@/storage/events'
import { useNow } from '@/time/use-now'

export default function DiagnosticsRoute(): ReactElement {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()
  const version = useEventVersion()
  const timeZone = place?.timeZone ?? 'UTC'
  const marks = useTodayMarks(timeZone, now)

  const days = place ? prayerTimesAcross(place, now, preferences) : []
  const windows = buildWindows(days)
  const today = days[1]

  const facts: [string, string][] = [
    ['place', place ? `${place.label} (${place.latitude}, ${place.longitude})` : 'not set'],
    ['timeZone', timeZone],
    ['now', now.toISOString()],
    ['log day', civilDateKey(logDay(now, timeZone))],
    ['schema version', String(schemaVersion())],
    ['event rows', String(eventCount())],
    ['store version', String(version)],
    ['windows built', String(windows.length)],
    ['current window', windowAt(now, windows)?.name ?? 'none'],
    ['today fajr', today ? String(today.fajr) : 'no times'],
    ['today dhuhr', today ? String(today.dhuhr) : 'no times'],
    ['marks today', JSON.stringify(Object.keys(marks))],
    ['last storage error', lastStorageError() ?? 'none'],
  ]

  return (
    <DiagnosticsScreen
      facts={facts}
      recent={recentEvents().map(
        (event) => `${event.id} ${event.kind} ${event.subject} ${event.logDay}`,
      )}
      onRecordTestMark={() => markPrayer('fajr', new Date(), timeZone)}
    />
  )
}
