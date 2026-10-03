import { getPlace } from '@ihsaanly/state/location/store'
import type { NotificationContent } from '@ihsaanly/state/notifications/content'
import {
  announcementData,
  DEFAULT_ACTION,
  LATER_DELAY_MS,
  parseNotificationData,
  REMINDER_CATEGORY,
} from '@ihsaanly/state/notifications/payload'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { router } from 'expo-router'
import { openAnnouncement } from '@/push/open'
import { scheduleLater } from './schedule'

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
  // A pushed announcement tapped on iOS carries the console's raw data, not ours.
  const data = parseNotificationData(content.data) ?? announcementData(content.data)
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
      else if (data.kind === 'announcement') openAnnouncement(data)
      else router.push('/')
  }
}
