import { router } from 'expo-router'

import { getPlace } from '@/location/store'
import { completeItem } from '@/plan/completions'

import type { NotificationContent } from './content'
import { DEFAULT_ACTION, parseNotificationData, REMINDER_CATEGORY } from './payload'
import { LATER_DELAY_MS, scheduleLater } from './schedule'

/** The slice of a response this module reads; the full type belongs to expo-notifications. */
export interface Response {
  actionIdentifier: string
  notification: {
    request: {
      identifier: string
      content: { title: string | null; body: string | null; data?: unknown }
    }
  }
}

const handled = new Set<string>()

/**
 * Every way a response reaches JavaScript funnels through here: the warm
 * listener, the cold-start replay and the Android background task. Each
 * request is answered once, and each answer is safe to repeat anyway.
 */
export async function handleResponse(response: Response, navigate = true): Promise<void> {
  const key = `${response.notification.request.identifier}:${response.actionIdentifier}`
  if (handled.has(key)) return
  handled.add(key)

  const { content } = response.notification.request
  const data = parseNotificationData(content.data)
  if (!data) return

  const timeZone = getPlace()?.timeZone ?? 'UTC'

  switch (response.actionIdentifier) {
    case 'done':
      if (data.kind === 'item') completeItem(data.itemId, new Date(), timeZone)
      return

    case 'later': {
      if (data.kind !== 'item') return
      const at = new Date(Date.now() + LATER_DELAY_MS)
      // A snooze past the window's end would remind of something already gone.
      if (at.getTime() >= data.endsAt) return
      const again: NotificationContent = {
        identifier: `later:${data.itemId}@${at.getTime()}`,
        title: content.title ?? data.itemId,
        body: content.body ?? '',
        at,
        channelId: 'reminders',
        categoryIdentifier: REMINDER_CATEGORY,
        data,
      }
      await scheduleLater(again)
      return
    }

    case DEFAULT_ACTION:
    default:
      if (!navigate) return
      if (data.kind === 'item') router.push(`/item/${data.itemId}`)
      else if (data.kind === 'test') router.push('/notifications')
      else router.push('/')
  }
}
