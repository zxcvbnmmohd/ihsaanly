import type { ReactElement } from 'react'

import { itemById, resolveText } from '@/content'
import { useHijriDate } from '@/hijri/use-hijri-date'
import { usePlace } from '@/location/store'
import type { PlannedItem } from '@/plan/signals'
import { usePlan } from '@/plan/use-plan'
import { markMadeUp, markPrayer, useQada, useTodayMarks } from '@/prayer/marks'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { useCurrentWindow } from '@/prayer/use-current-window'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows } from '@/prayer/windows'
import { TodayScreen, type TodayEntry } from '@/screens/today'
import { strings } from '@/strings'
import { useNow } from '@/time/use-now'

function detailFor(planned: PlannedItem): string | null {
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
  const window = useCurrentWindow()
  const hijri = useHijriDate()
  const planned = usePlan()
  const marks = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const qada = useQada()

  const onMarkPrayer = (prayer: Prayer): void => {
    if (!place) return
    const windows = buildWindows(prayerTimesAcross(place, now, preferences))
    const current = windows.filter((entry) => entry.name === prayer && entry.startsAt <= now).pop()
    if (!current) return
    markPrayer(prayer, now, place.timeZone, current.startsAt, current.endsAt)
  }

  const onMakeUp = (prayer: Prayer): void => {
    if (!place) return
    markMadeUp(prayer, now, place.timeZone)
  }

  return (
    <TodayScreen
      hasLocation={place !== null}
      window={window?.name ?? null}
      hijri={hijri}
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
      onMarkPrayer={onMarkPrayer}
      onMakeUp={onMakeUp}
      locationHref="/location"
    />
  )
}
