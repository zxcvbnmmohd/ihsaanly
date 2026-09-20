import { useEffect } from 'react'
import { AppState } from 'react-native'

import { items } from '@/content'
import type { Plan } from '@/plan/signals'
import { getStrings } from '@/strings'

import { notificationContent, type NotificationContent } from './content'
import { ensurePermission, sync } from './schedule'

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

  useEffect(() => {
    if (!plan) return

    let cancelled = false

    const run = async (): Promise<void> => {
      const granted = await ensurePermission(getStrings())
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
