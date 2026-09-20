import { assertNever } from '@/assert-never'
import type { Prayer, ScheduledNotification } from '@/plan/signals'

/** The value expo-notifications reports for a plain tap on the notification body. */
export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT'

export const REMINDER_CATEGORY = 'reminder'

export type ReminderAction = 'done' | 'later'

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

const PRAYERS: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

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
    default:
      return null
  }
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
    default:
      return assertNever(entry)
  }
}

export const PLAN_PREFIX = 'plan:'
