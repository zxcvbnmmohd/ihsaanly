import { items, personalItems } from '@ihsaanly/core/content'
import type { Plan, Prayer } from '@ihsaanly/core/plan/signals'
import { usePlace } from '@ihsaanly/state/location/store'
import {
  type NotificationContent,
  notificationContent,
} from '@ihsaanly/state/notifications/content'
import { useTodayMarks } from '@ihsaanly/state/prayer/marks'
import { getStrings } from '@ihsaanly/state/strings'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { hasPermission, sync } from './schedule'

function contentsFor(plan: Plan): NotificationContent[] {
  const strings = getStrings()
  // The user's own duas with a moment are planned too; their words come from them.
  const known = [...items, ...personalItems()]
  return plan.notifications.flatMap((entry) => notificationContent(entry, known, strings) ?? [])
}

/**
 * Keyed on the schedule's identifiers rather than the plan object. The plan is
 * rebuilt every minute as the clock advances, and re-syncing once a minute
 * would be both wasteful and unreliable. The identifier carries kind, subject
 * and instant, which is everything that decides what is pending.
 */
function scheduleKey(plan: Plan | null): string {
  if (!plan) return ''
  return contentsFor(plan)
    .map((content) => content.identifier)
    .join('|')
}

/**
 * The prayers marked today, in a fixed order. A mark made anywhere (the Today
 * strip, a widget tap taken in, the shade, another device) changes it, so the
 * sync that follows withdraws that prayer's pending second ask.
 */
function useMarkedToday(): Prayer[] {
  const place = usePlace()
  const marks = useTodayMarks(place?.timeZone ?? 'UTC', new Date())
  return (Object.keys(marks) as Prayer[]).sort()
}

export function useNotificationSync(plan: Plan | null): void {
  const marked = useMarkedToday()
  const key = `${scheduleKey(plan)}#${marked.join(',')}`

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` fingerprints the whole schedule and today's marks, so the effect re-runs only when what is pending, or what has been answered, changes.
  useEffect(() => {
    if (!plan) return

    let cancelled = false

    const run = async (): Promise<void> => {
      const granted = await hasPermission(getStrings())
      if (!granted || cancelled) return
      await sync(contentsFor(plan), plan.today.pausedNotice !== null, marked)
    }

    void run()

    // Re-arm when the app comes back, since the horizon moves while it is away.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run()
    })

    return (): void => {
      cancelled = true
      subscription.remove()
    }
  }, [key])
}
