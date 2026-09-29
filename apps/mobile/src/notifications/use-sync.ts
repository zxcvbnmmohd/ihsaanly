import { items } from '@ihsaanly/core/content'
import type { Plan } from '@ihsaanly/core/plan/signals'
import {
  type NotificationContent,
  notificationContent,
} from '@ihsaanly/state/notifications/content'
import { getStrings } from '@ihsaanly/state/strings'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { hasPermission, sync } from './schedule'

function contentsFor(plan: Plan): NotificationContent[] {
  const strings = getStrings()
  return plan.notifications.flatMap((entry) => notificationContent(entry, items, strings) ?? [])
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

export function useNotificationSync(plan: Plan | null): void {
  const key = scheduleKey(plan)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` fingerprints the whole schedule, so the effect re-runs only when what is pending changes.
  useEffect(() => {
    if (!plan) return

    let cancelled = false

    const run = async (): Promise<void> => {
      const granted = await hasPermission(getStrings())
      if (!granted || cancelled) return
      await sync(contentsFor(plan))
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
