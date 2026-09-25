import { assertNever } from '@/assert-never'
import { resolveText } from '@/content'
import type { Item } from '@/content/schema'
import { prayerName } from '@/plan/jumuah'
import type { ScheduledNotification } from '@/plan/signals'
import type { Strings } from '@/strings'

import { identifierFor, REMINDER_CATEGORY, type NotificationData } from './payload'

export type ChannelId = 'reminders' | 'prayers'

export interface NotificationContent {
  identifier: string
  title: string
  body: string
  at: Date
  channelId: ChannelId
  categoryIdentifier?: typeof REMINDER_CATEGORY
  data: NotificationData
}

/**
 * Words for one scheduled entry. Nothing here ever says the user failed at
 * something: a reminder names what is open, and where the item has one, teaches
 * rather than announces.
 *
 * The item's own `reminder` wins over the generic status line. `resolveText`
 * returns null for a language the content does not carry, so an Arabic reader
 * gets the interface sentence rather than an English one — which is why the
 * fallback stays rather than being replaced.
 */
export function notificationContent(
  entry: ScheduledNotification,
  items: Item[],
  strings: Strings,
): NotificationContent | null {
  switch (entry.kind) {
    case 'item': {
      const item = items.find((candidate) => candidate.id === entry.itemId)
      if (!item) return null
      const reason = entry.reason === 'upcoming' ? 'upcoming' : 'current-window'

      return {
        identifier: identifierFor(entry),
        title: resolveText(item.title) ?? item.id,
        body:
          resolveText(item.reminder) ??
          (reason === 'upcoming'
            ? strings.notifications.body.tomorrow
            : entry.window
              ? strings.notifications.body.windowUntil(
                  prayerName(strings, entry.window.closes, entry.window.jumuah),
                )
              : strings.notifications.body.window),
        at: entry.at,
        channelId: 'reminders',
        categoryIdentifier: REMINDER_CATEGORY,
        data: {
          v: 1,
          kind: 'item',
          itemId: item.id,
          endsAt: entry.window?.endsAt.getTime() ?? entry.at.getTime(),
          reason,
        },
      }
    }

    case 'prayer':
      return {
        identifier: identifierFor(entry),
        title: prayerName(strings, entry.prayer, entry.jumuah),
        body: strings.notifications.body.prayerWindow,
        at: entry.at,
        channelId: 'prayers',
        data: { v: 1, kind: 'prayer', prayer: entry.prayer },
      }

    default:
      return assertNever(entry)
  }
}
