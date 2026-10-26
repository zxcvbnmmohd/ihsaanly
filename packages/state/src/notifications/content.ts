import { assertNever } from '@ihsaanly/core/assert-never'
import { resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import { prayerName } from '@ihsaanly/core/plan/jumuah'
import type { ScheduledNotification } from '@ihsaanly/core/plan/signals'
import type { Strings } from '../strings'

import {
  identifierFor,
  type NotificationCategory,
  type NotificationData,
  PRAYER_CATEGORY,
  REMINDER_CATEGORY,
} from './payload'

export type ChannelId = 'reminders' | 'prayers'

export interface NotificationContent {
  identifier: string
  title: string
  body: string
  at: Date
  channelId: ChannelId
  categoryIdentifier?: NotificationCategory
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
 *
 * A reminder inside a window ends on a rough cue, "Open until Dhuhr.", never a
 * clock time. The night prayer reminder asks instead of telling: "Have you
 * prayed Witr?", then "Until Fajr."
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
      const title = resolveText(item.title) ?? item.id
      const asks = entry.reason === 'after-prayer'
      const closes = entry.window
        ? prayerName(strings, entry.window.closes, entry.window.jumuah)
        : null
      const cue =
        reason === 'upcoming' || closes === null
          ? null
          : asks
            ? strings.notifications.body.until(closes)
            : strings.notifications.body.windowUntil(closes)
      const reminder = resolveText(item.reminder)

      return {
        identifier: identifierFor(entry),
        title: asks ? strings.notifications.askPrayed(title) : title,
        // A sentence that already names the end ("before Maghrib") needs no cue.
        body: reminder
          ? cue && closes && !reminder.includes(closes)
            ? `${reminder} ${cue}`
            : reminder
          : (cue ??
            (reason === 'upcoming'
              ? strings.notifications.body.tomorrow
              : strings.notifications.body.window)),
        at: entry.at,
        channelId: 'reminders',
        // A question takes the prayer reminder's answers, "Yes, I've prayed"
        // and "Not yet", rather than "Done" and "Later".
        categoryIdentifier: asks ? PRAYER_CATEGORY : REMINDER_CATEGORY,
        data: {
          v: 1,
          kind: 'item',
          itemId: item.id,
          endsAt: entry.window?.endsAt.getTime() ?? entry.at.getTime(),
          reason,
          ...(asks ? { asks: true as const } : {}),
        },
      }
    }

    // A question with a gentle why, never a verdict: "Not yet" is an answer
    // too. Only planned while tracking runs, so it never asks during a pause.
    case 'prayer':
      return {
        identifier: identifierFor(entry),
        title: strings.notifications.prayerArrived(prayerName(strings, entry.prayer, entry.jumuah)),
        body: strings.notifications.prayerAsk[
          entry.prayer === 'dhuhr' && entry.jumuah ? 'jumuah' : entry.prayer
        ],
        at: entry.at,
        channelId: 'prayers',
        categoryIdentifier: PRAYER_CATEGORY,
        data: {
          v: 1,
          kind: 'prayer',
          prayer: entry.prayer,
          window: { startsAt: entry.at.getTime(), endsAt: entry.endsAt.getTime() },
        },
      }

    // Both can be read on a locked screen by anyone holding the phone, so
    // neither says why: no pause, no reason, only the moment. The item's own
    // reminder text is deliberately not used here.
    case 'remembrance':
      return {
        identifier: identifierFor(entry),
        title: prayerName(strings, entry.prayer, false),
        body: strings.notifications.pausedRemembrance,
        at: entry.at,
        channelId: 'prayers',
        categoryIdentifier: REMINDER_CATEGORY,
        data: {
          v: 1,
          kind: 'item',
          itemId: entry.itemId,
          endsAt: entry.endsAt.getTime(),
          reason: 'current-window',
        },
      }

    case 'check-in':
      return {
        identifier: identifierFor(entry),
        title: strings.notifications.checkIn,
        body: '',
        at: entry.at,
        channelId: 'reminders',
        data: { v: 1, kind: 'check-in' },
      }

    default:
      return assertNever(entry)
  }
}
