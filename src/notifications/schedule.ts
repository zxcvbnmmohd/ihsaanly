import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import type { ScheduledNotification } from '@/plan/signals'

export interface NotificationContent {
  itemId: string
  title: string
  body: string
  at: Date
}

/**
 * Nothing here ever tells the user they failed at something. A reminder names
 * what is available and when; it never scores what was not done.
 */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13 shows no permission prompt until a channel exists.
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  if (existing.granted) return true

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

/**
 * Cancel-then-schedule, so re-arming is idempotent however often it runs. The
 * plan is the single source of what should be pending.
 */
export async function sync(contents: NotificationContent[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync()

  const future = contents.filter((content) => content.at.getTime() > Date.now())

  await Promise.all(
    future.map((content) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: { itemId: content.itemId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: content.at,
          channelId: 'reminders',
        },
      }),
    ),
  )

  return future.length
}

export function pendingCount(): Promise<number> {
  return Notifications.getAllScheduledNotificationsAsync().then((all) => all.length)
}

export type { ScheduledNotification }
