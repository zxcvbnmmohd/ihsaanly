import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

export interface NotificationContent {
  itemId: string
  title: string
  body: string
  at: Date
}

type NotificationsApi = typeof import('expo-notifications')

/**
 * Loaded on demand rather than imported at module scope, and then checked for
 * what it actually needs.
 *
 * In Expo Go the import resolves but does not finish: one of the library's own
 * submodules requires a native module that is not there, and what comes back is
 * a half-populated namespace. So "did the import throw" is not the question —
 * "is what came back usable" is.
 *
 * Reminders are optional. Their absence degrades; it does not break the app.
 */
function isUsable(api: Partial<NotificationsApi>): api is NotificationsApi {
  return (
    typeof api.scheduleNotificationAsync === 'function' &&
    typeof api.cancelAllScheduledNotificationsAsync === 'function' &&
    typeof api.getPermissionsAsync === 'function' &&
    api.SchedulableTriggerInputTypes !== undefined &&
    api.AndroidImportance !== undefined
  )
}

/**
 * Expo Go does not ship the native side of expo-notifications, and importing it
 * there throws inside the library's own module evaluation — logged by Metro
 * whether or not we handle it. Not attempting the import keeps that noise out
 * of a log where it would only distract from a real problem.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
}

async function notifications(): Promise<NotificationsApi | null> {
  if (isExpoGo()) return null

  try {
    const api = (await import('expo-notifications')) as Partial<NotificationsApi>
    return isUsable(api) ? api : null
  } catch {
    return null
  }
}

export async function ensurePermission(): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  try {
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
  } catch {
    return false
  }
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

  try {
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
  } catch {
    return 0
  }
}

export async function pendingCount(): Promise<number> {
  const api = await notifications()
  if (!api) return 0

  try {
    return (await api.getAllScheduledNotificationsAsync()).length
  } catch {
    return 0
  }
}
