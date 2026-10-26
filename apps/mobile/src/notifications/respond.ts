import { civilDateKey, logDay } from '@ihsaanly/core/day/boundaries'
import { getPlace } from '@ihsaanly/state/location/store'
import type { NotificationContent } from '@ihsaanly/state/notifications/content'
import {
  announcementData,
  DEFAULT_ACTION,
  LATER_DELAY_MS,
  type NotificationData,
  PRAYER_AGAIN_CATEGORY,
  PRAYER_AGAIN_MIN_LEFT_MS,
  PRAYER_LATER_PREFIX,
  parseNotificationData,
  REMINDER_CATEGORY,
} from '@ihsaanly/state/notifications/payload'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { getUserState } from '@ihsaanly/state/plan/user-state-store'
import { markPrayer } from '@ihsaanly/state/prayer/marks'
import { markedPrayersOn } from '@ihsaanly/state/storage/events'
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

type PrayerData = Extract<NotificationData, { kind: 'prayer' }>

/**
 * "Yes, I've prayed", through the same mark the Today strip makes. Nothing
 * while tracking is paused, and nothing twice: a prayer already marked in the
 * app stays as it was.
 */
function markFromShade(data: PrayerData, timeZone: string): void {
  if (getUserState().trackingPaused) return
  const now = new Date()
  if (markedPrayersOn(civilDateKey(logDay(now, timeZone))).includes(data.prayer)) return
  const window = data.window
    ? { startsAt: new Date(data.window.startsAt), endsAt: new Date(data.window.endsAt) }
    : undefined
  markPrayer(data.prayer, now, timeZone, window)
}

/**
 * "Not yet" asks once more, a little later, with only the first button. Not
 * when that would land in the last minutes of the window or past it, and
 * not during a pause.
 */
async function askAgain(
  data: PrayerData,
  content: Response['notification']['request']['content'],
): Promise<void> {
  if (getUserState().trackingPaused || !data.window) return
  const at = new Date(Date.now() + LATER_DELAY_MS)
  if (at.getTime() > data.window.endsAt - PRAYER_AGAIN_MIN_LEFT_MS) return
  await scheduleLater({
    identifier: `${PRAYER_LATER_PREFIX}${data.prayer}@${at.getTime()}`,
    title: content.title ?? '',
    body: content.body ?? '',
    at,
    channelId: 'prayers',
    categoryIdentifier: PRAYER_AGAIN_CATEGORY,
    data,
  })
}

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
      if (data.kind === 'prayer') markFromShade(data, timeZone)
      return

    case 'later': {
      if (data.kind === 'prayer') return askAgain(data, content)
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
