import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

import type { Strings } from '@/strings'

import type { NotificationContent } from './content'
import { REMINDER_CATEGORY } from './payload'
import { planSync } from './sync-plan'

export type NotificationsApi = typeof import('expo-notifications')

/** Registered so Android can hand a background action tap to JavaScript. */
export const NOTIFICATION_TASK = 'ihsaanly-notification-response'

/** A snooze re-arms the same words this much later, if the window is still open. */
export const LATER_DELAY_MS = 30 * 60_000

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
    typeof api.getAllScheduledNotificationsAsync === 'function' &&
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

export async function notifications(): Promise<NotificationsApi | null> {
  if (isExpoGo()) return null

  try {
    const api = (await import('expo-notifications')) as Partial<NotificationsApi>
    return isUsable(api) ? api : null
  } catch {
    return null
  }
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable'

export async function permissionStatus(): Promise<PermissionStatus> {
  const api = await notifications()
  if (!api) return 'unavailable'

  try {
    const current = await api.getPermissionsAsync()
    if (current.granted) return 'granted'
    return current.canAskAgain ? 'undetermined' : 'denied'
  } catch {
    return 'unavailable'
  }
}

/**
 * Channels, the action category and the background task are declared here,
 * before the permission prompt, because Android 13 shows no prompt until a
 * channel exists and because every path that schedules goes through here.
 */
async function prepare(api: NotificationsApi, strings: Strings): Promise<void> {
  if (Platform.OS === 'android') {
    await api.setNotificationChannelAsync('reminders', {
      name: strings.notifications.title,
      importance: api.AndroidImportance.DEFAULT,
    })
    await api.setNotificationChannelAsync('prayers', {
      name: strings.notifications.prayers,
      importance: api.AndroidImportance.DEFAULT,
    })
  }

  await api.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: 'done',
      buttonTitle: strings.notifications.action.done,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'later',
      buttonTitle: strings.notifications.action.later,
      options: { opensAppToForeground: false },
    },
  ])

  try {
    await api.registerTaskAsync(NOTIFICATION_TASK)
  } catch {
    // Without the task an action tap while the app is killed is answered on
    // the next open instead; see respond.ts.
  }
}

/**
 * Asks. Only ever called from something the user pressed — the "Allow
 * reminders" button in onboarding, or the Reminders screen — because an app
 * that asks for notifications unprompted is the one people mute on day one.
 */
export async function ensurePermission(strings: Strings): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  try {
    await prepare(api, strings)

    const existing = await api.getPermissionsAsync()
    if (existing.granted) return true

    const requested = await api.requestPermissionsAsync()
    return requested.granted
  } catch {
    return false
  }
}

/**
 * Checks, and never asks. This is what the background sync uses: someone who
 * skipped the reminders step should not be prompted by opening Today, which is
 * exactly what happened until this existed. Channels are still prepared, so a
 * later grant has somewhere to deliver.
 */
export async function hasPermission(strings: Strings): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  try {
    const existing = await api.getPermissionsAsync()
    if (!existing.granted) return false

    // Only once there is something to deliver to. Channels and the action
    // category cost nothing to declare, but declaring them for someone who has
    // not granted anything is work on behalf of a decision not yet made.
    await prepare(api, strings)
    return true
  } catch {
    return false
  }
}

async function scheduleOne(api: NotificationsApi, content: NotificationContent): Promise<void> {
  await api.scheduleNotificationAsync({
    identifier: content.identifier,
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      ...(content.categoryIdentifier ? { categoryIdentifier: content.categoryIdentifier } : {}),
    },
    trigger: {
      type: api.SchedulableTriggerInputTypes.DATE,
      date: content.at,
      channelId: content.channelId,
    },
  })
}

/**
 * Diff, not cancel-all. Only entries the plan owns (`plan:`) are touched, so a
 * snooze made while the app was killed survives the next sync. Re-arming is
 * still idempotent however often it runs.
 *
 * Nothing scheduled here ever tells the user they failed at something: a
 * reminder names what is available and when, and never scores what was not done.
 */
export async function sync(contents: NotificationContent[]): Promise<number> {
  const api = await notifications()
  if (!api) return 0

  try {
    const pending = await api.getAllScheduledNotificationsAsync()
    const { cancel, add } = planSync(
      contents,
      pending.map((request) => request.identifier),
      Date.now(),
    )

    await Promise.all(cancel.map((id) => api.cancelScheduledNotificationAsync(id)))
    await Promise.all(add.map((content) => scheduleOne(api, content)))

    return contents.filter((content) => content.at.getTime() > Date.now()).length
  } catch {
    return 0
  }
}

/** The same words again, a little later. Nothing if the window has closed by then. */
export async function scheduleLater(content: NotificationContent): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  try {
    await scheduleOne(api, content)
    return true
  } catch {
    return false
  }
}

/** A reminder a few seconds out, so the user can see and hear what one is like. */
export async function scheduleTest(strings: Strings): Promise<boolean> {
  const api = await notifications()
  if (!api) return false

  try {
    await prepare(api, strings)
    const at = new Date(Date.now() + 5_000)
    await scheduleOne(api, {
      identifier: `test:${at.getTime()}`,
      title: strings.notifications.testTitle,
      body: strings.notifications.testBody,
      at,
      channelId: 'reminders',
      categoryIdentifier: REMINDER_CATEGORY,
      data: { v: 1, kind: 'test' },
    })
    return true
  } catch {
    return false
  }
}
