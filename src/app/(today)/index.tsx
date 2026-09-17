import type { ReactElement } from 'react'

import { itemById, resolveText } from '@/content'
import { useHijriDate } from '@/hijri/use-hijri-date'
import { usePlace } from '@/location/store'
import type { PlannedItem } from '@/plan/signals'
import { usePlan } from '@/plan/use-plan'
import { useCurrentWindow } from '@/prayer/use-current-window'
import { TodayScreen, type TodayEntry } from '@/screens/today'
import { strings } from '@/strings'

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
  const window = useCurrentWindow()
  const hijri = useHijriDate()
  const planned = usePlan()

  return (
    <TodayScreen
      hasLocation={place !== null}
      window={window?.name ?? null}
      hijri={hijri}
      rightNow={planned?.today.rightNow ? toEntry(planned.today.rightNow) : null}
      context={planned?.today.context.flatMap((entry) => toEntry(entry) ?? []) ?? []}
      comingUp={planned?.today.comingUp.flatMap((entry) => toEntry(entry) ?? []) ?? []}
      locationHref="/location"
    />
  )
}
