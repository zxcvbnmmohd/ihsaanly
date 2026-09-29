// chrome.alarms as the pending list apps/mobile/src/notifications/schedule.ts
// keeps with expo-notifications: planSync decides, this applies. Kept apart
// from the hooks in ./reminders so it (and its test) never load the app's
// strings, and so background.ts can share its types and keys.
import type { Strings } from '@ihsaanly/core/strings/en'
import type { NotificationContent } from '@ihsaanly/state/notifications/content'
import { planSync } from '@ihsaanly/state/notifications/sync-plan'

/** The badge's own repeating alarm; never a `plan:` id, so planSync leaves it be. */
export const BADGE_ALARM = 'badge'
/** chrome.storage.local keys shared with background.ts. */
export const BADGE_KEY = 'badge'
export const DONE_QUEUE_KEY = 'done-queue'
/** chrome.storage.session key: a route for the popup to open on, left by a notification click. */
export const OPEN_ROUTE_KEY = 'open-route'

/** What background.ts needs to show one reminder, stored under its alarm's name. */
export interface Reminder {
  title: string
  body: string
  itemId: string | null
  /** When the item's window closes; a snooze past it is not offered. */
  endsAt: number | null
  /** Button labels, in the user's language, since the worker cannot read the strings. */
  actions: { done: string; later: string }
}

/** A "Done" pressed on a notification, applied by the popup the next time it opens. */
export interface QueuedDone {
  itemId: string
  at: number
}

/** The slice of `chrome` this file touches, so a test can hand in a fake. */
export interface ReminderApi {
  alarms: Pick<typeof chrome.alarms, 'getAll' | 'create' | 'clear'>
  storage: { local: Pick<typeof chrome.storage.local, 'set' | 'remove'> }
}

export function reminderFor(
  content: NotificationContent,
  strings: Pick<Strings, 'notifications'>,
): Reminder {
  const item = content.data.kind === 'item' ? content.data : null
  return {
    title: content.title,
    body: content.body,
    itemId: item?.itemId ?? null,
    endsAt: item?.endsAt ?? null,
    actions: strings.notifications.action,
  }
}

export async function syncReminders(
  contents: NotificationContent[],
  strings: Pick<Strings, 'notifications'>,
  api: ReminderApi,
  now = Date.now(),
): Promise<void> {
  const pending = (await api.alarms.getAll()).map((alarm) => alarm.name)
  const { cancel, add } = planSync(contents, pending, now)

  await Promise.all(cancel.map((id) => api.alarms.clear(id)))
  if (cancel.length > 0) await api.storage.local.remove(cancel)

  if (add.length === 0) return
  await api.storage.local.set(
    Object.fromEntries(add.map((content) => [content.identifier, reminderFor(content, strings)])),
  )
  await Promise.all(
    add.map((content) => api.alarms.create(content.identifier, { when: content.at.getTime() })),
  )
}
