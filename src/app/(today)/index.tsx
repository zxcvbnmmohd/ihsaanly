import type { ReactElement } from 'react'

import { itemById, resolveText } from '@/content'
import { usePlace } from '@/location/store'
import type { PlannedItem } from '@/plan/signals'
import { usePlan } from '@/plan/use-plan'
import { markMadeUp, markPrayer, unmarkPrayer, useQada, useTodayMarks } from '@/prayer/marks'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows } from '@/prayer/windows'
import { TodayScreen, type TodayEntry } from '@/screens/today'
import { strings } from '@/strings'
import { useNow } from '@/time/use-now'

function detailFor(planned: PlannedItem): string | null {
  if (planned.optional) return strings.plan.optional
  if (planned.reason !== 'upcoming') return null
  return planned.daysAway === 1 ? strings.plan.tomorrow : strings.plan.inDays(planned.daysAway ?? 0)
}

function toEntry(planned: PlannedItem): TodayEntry | null {
  const item = itemById(planned.itemId)
  if (!item) return null

  return {
    id: planned.itemId,
    title: resolveText(item.title) ?? item.id,
    detail: detailFor(planned),
    href: `/item/${item.id}`,
  }
}

export default function TodayRoute(): ReactElement {
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()
  const planned = usePlan()
  const marks = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const qada = useQada()

  const togglePrayer = (prayer: Prayer): void => {
    if (!place) return

    if (marks[prayer]) {
      unmarkPrayer(prayer, now, place.timeZone)
      return
    }

    const windows = buildWindows(prayerTimesAcross(place, now, preferences))
    const current = windows.filter((entry) => entry.name === prayer && entry.startsAt <= now).pop()

    markPrayer(prayer, now, place.timeZone, current)
  }

  return (
    <TodayScreen
      hasLocation={place !== null}
      window={planned?.today.window ?? null}
      hijri={planned?.today.hijri ?? null}
      rightNow={planned?.today.rightNow ? toEntry(planned.today.rightNow) : null}
      context={planned?.today.context.flatMap((entry) => toEntry(entry) ?? []) ?? []}
      comingUp={planned?.today.comingUp.flatMap((entry) => toEntry(entry) ?? []) ?? []}
      prayers={
        place ? PRAYERS.map((prayer) => ({ prayer, done: marks[prayer] !== undefined })) : []
      }
      qada={Object.entries(qada).map(([prayer, count]) => ({
        prayer: prayer as Prayer,
        count: count ?? 0,
      }))}
      onMarkPrayer={togglePrayer}
      onMakeUp={onMakeUpFor(place?.timeZone, now)}
      locationHref="/location"
    />
  )
}

function onMakeUpFor(timeZone: string | undefined, now: Date): (prayer: Prayer) => void {
  return (prayer) => {
    if (timeZone) markMadeUp(prayer, now, timeZone)
  }
}
