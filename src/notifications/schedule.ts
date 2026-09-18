import { Platform } from 'react-native'

export interface NotificationContent {
  itemId: string
  title: string
  body: string
  at: Date
}

/**
 * Loaded on demand rather than imported at module scope. expo-notifications is
 * absent in Expo Go, and a static import there throws before the module body
 * runs — which takes down whatever route imported it, reported as a missing
 * default export rather than as anything naming the cause.
 *
 * Reminders are optional. Their absence degrades; it does not break the app.
 */
async function notifications(): Promise<typeof import('expo-notifications') | null> {
  try {
    return await import('expo-notifications')
  } catch {
    return null
  }
}

export async function ensurePermission(): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  if (Platform.OS === 'android') {
    // Android 13 shows no permission prompt until a channel exists.
    await api.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: api.AndroidImportance.DEFAULT,
    })
  }

  const existing = await api.getPermissionsAsync()
  if (existing.granted) return true

  const requested = await api.requestPermissionsAsync()
  return requested.granted
}

/**
 * Cancel-then-schedule, so re-arming is idempotent however often it runs. The
 * plan is the single source of what should be pending.
 *
 * Nothing scheduled here ever tells the user they failed at something: a
 * reminder names what is available and when, and never scores what was not done.
 */
export async function sync(contents: NotificationContent[]): Promise<number> {
  const api = await notifications()
  if (!api) return 0

  await api.cancelAllScheduledNotificationsAsync()

  const future = contents.filter((content) => content.at.getTime() > Date.now())

  await Promise.all(
    future.map((content) =>
      api.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: { itemId: content.itemId },
        },
        trigger: {
          type: api.SchedulableTriggerInputTypes.DATE,
          date: content.at,
          channelId: 'reminders',
        },
      }),
    ),
  )

  return future.length
}

export async function pendingCount(): Promise<number> {
  const api = await notifications()
  if (!api) return 0

  return (await api.getAllScheduledNotificationsAsync()).length
}
