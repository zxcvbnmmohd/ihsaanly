import { useEffect } from 'react'
import { AppState } from 'react-native'

import { resolveText, itemById } from '@/content'
import type { Plan } from '@/plan/signals'
import { getStrings } from '@/strings'

import { ensurePermission, sync, type NotificationContent } from './schedule'

function contentsFor(plan: Plan): NotificationContent[] {
  return plan.notifications.flatMap((entry) => {
    const item = itemById(entry.itemId)
    if (!item) return []

    return [
      {
        itemId: entry.itemId,
        title: resolveText(item.title) ?? entry.itemId,
        body:
          entry.reason === 'upcoming'
            ? getStrings().notifications.body.tomorrow
            : getStrings().notifications.body.window,
        at: entry.at,
      },
    ]
  })
}

/**
 * Keyed on the schedule's contents rather than the plan object. The plan is
 * rebuilt every minute as the clock advances, and cancelling and rescheduling
 * everything once a minute would be both wasteful and unreliable.
 */
function scheduleKey(plan: Plan | null): string {
  if (!plan) return ''
  return plan.notifications.map((entry) => `${entry.itemId}@${entry.at.getTime()}`).join('|')
}

export function useNotificationSync(plan: Plan | null): void {
  const key = scheduleKey(plan)

  useEffect(() => {
    if (!plan) return

    let cancelled = false

    const run = async (): Promise<void> => {
      const granted = await ensurePermission()
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
