import { assertNever } from '@ihsaanly/core/assert-never'
import type { Prayer, ScheduledNotification } from '@ihsaanly/core/plan/signals'

/** The value expo-notifications reports for a plain tap on the notification body. */
export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT'

export const REMINDER_CATEGORY = 'reminder'

export type ReminderAction = 'done' | 'later'

/** A snooze re-arms the same words this much later, if the window is still open. */
export const LATER_DELAY_MS = 30 * 60_000

/**
 * What a notification carries so a tap can be answered later, from a cold
 * start or a background task, without the plan that produced it. JSON-safe,
 * versioned, and narrowed on the way back in.
 */
export type NotificationData =
  | {
      v: 1
      kind: 'item'
      itemId: string
      endsAt: number
      reason: 'current-window' | 'upcoming'
    }
  | { v: 1; kind: 'prayer'; prayer: Prayer }
  | { v: 1; kind: 'test' }
  | { v: 1; kind: 'check-in' }
  | { v: 1; kind: 'announcement'; route: string | null; url: string | null }

const PRAYERS: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

/** An in-app path such as `/item/fasting-monday`; never a scheme or a host. */
function routeOf(value: unknown): string | null {
  return typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value) ? value : null
}

/** Only https: an announcement never opens another app or a plain-text page. */
function urlOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseNotificationData(value: unknown): NotificationData | null {
  if (!isRecord(value) || value.v !== 1) return null

  switch (value.kind) {
    case 'item':
      return typeof value.itemId === 'string' &&
        typeof value.endsAt === 'number' &&
        (value.reason === 'current-window' || value.reason === 'upcoming')
        ? { v: 1, kind: 'item', itemId: value.itemId, endsAt: value.endsAt, reason: value.reason }
        : null
    case 'prayer':
      return PRAYERS.includes(value.prayer as Prayer)
        ? { v: 1, kind: 'prayer', prayer: value.prayer as Prayer }
        : null
    case 'test':
      return { v: 1, kind: 'test' }
    case 'check-in':
      return { v: 1, kind: 'check-in' }
    case 'announcement':
      return { v: 1, kind: 'announcement', route: routeOf(value.route), url: urlOf(value.url) }
    default:
      return null
  }
}

/**
 * An announcement's own data, as the console sends it: optional `route` (an
 * in-app path) and `url` (an https page), both plain strings. Anything else in
 * it is ignored, and a malformed target is dropped rather than followed.
 */
export function announcementData(value: unknown): NotificationData | null {
  if (!isRecord(value)) return null
  // Without either key it is not ours to route: the tap just opens the app.
  if (typeof value.route !== 'string' && typeof value.url !== 'string') return null
  return parseNotificationData({ v: 1, kind: 'announcement', route: value.route, url: value.url })
}

/**
 * Stable per entry, so the schedule can be diffed against what is pending
 * instead of cancelled wholesale. `plan:` is the prefix sync owns; a snooze
 * (`later:`) or a test (`test:`) is never touched by it.
 */
export function identifierFor(entry: ScheduledNotification): string {
  switch (entry.kind) {
    case 'item':
      return `plan:${entry.itemId}@${entry.at.getTime()}`
    case 'prayer':
      return `plan:prayer:${entry.prayer}@${entry.at.getTime()}`
    case 'remembrance':
      return `plan:${entry.itemId}:${entry.prayer}@${entry.at.getTime()}`
    case 'check-in':
      return `plan:check-in@${entry.at.getTime()}`
    default:
      return assertNever(entry)
  }
}

export const PLAN_PREFIX = 'plan:'
