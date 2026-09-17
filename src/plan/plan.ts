import { assertNever } from '@/assert-never'
import type { Item, Ruling, Trigger } from '@/content/schema'
import { civilDateIn, isSameCivilDate, shiftDays } from '@/day/boundaries'
import { buildWindows, windowAt, type PrayerWindow, type WindowName } from '@/prayer/windows'

import { matchesDay, readingsDiverge } from './day-match'
import { isQuiet } from './quiet-hours'
import type {
  DayContext,
  Plan,
  PlanReason,
  PlannedItem,
  Prayer,
  ScheduledNotification,
  Signals,
} from './signals'

/** Apple keeps roughly 64 pending local notifications. Leave headroom. */
const MAX_PENDING_NOTIFICATIONS = 60

const REASON_RANK: Record<PlanReason, number> = {
  'active-event': 0,
  'current-window': 1,
  'after-prayer': 2,
  'before-prayer': 3,
  today: 4,
  upcoming: 5,
}

const RULING_RANK: Record<Ruling, number> = {
  fard: 0,
  wajib: 1,
  'sunnah-muakkadah': 2,
  sunnah: 3,
  mustahabb: 4,
  mubah: 5,
}

const WINDOW_FOR: Partial<Record<WindowName, 'morning' | 'evening'>> = {
  sunrise: 'morning',
  asr: 'evening',
}

/** The window that leads into each prayer. */
const PRECEDING_WINDOW: Record<Prayer, WindowName> = {
  fajr: 'isha',
  dhuhr: 'sunrise',
  asr: 'dhuhr',
  maghrib: 'asr',
  isha: 'maghrib',
}

/** The prayer a window belongs to, where it has one. */
const PRAYER_FOR_WINDOW: Partial<Record<WindowName, Prayer>> = {
  fajr: 'fajr',
  dhuhr: 'dhuhr',
  asr: 'asr',
  maghrib: 'maghrib',
  isha: 'isha',
}

function isRawatib(trigger: Trigger): boolean {
  return trigger.kind === 'prayer' && trigger.prayer !== 'any'
}

/**
 * On a journey fasting is a concession, not an expectation. It is still
 * offered, but never as something owed.
 */
/** Anything derived from a calculated calendar is offered, never asserted. */
function caveatFor(item: Item, day: DayContext): PlannedItem['caveat'] {
  if (item.trigger.kind !== 'day') return undefined
  return readingsDiverge(day) ? 'confirm-locally' : 'expected'
}

function isOptional(item: Item, signals: Signals): boolean {
  return signals.userState.travelling && item.category === 'fasting'
}

function availableItems(signals: Signals): Item[] {
  const enabled = new Set(signals.preferences.enabledItemIds)
  const { travelling, trackingPaused } = signals.userState

  return signals.items.filter((item) => {
    if (!enabled.has(item.id)) return false
    if (trackingPaused && item.trigger.kind === 'prayer') return false
    if (travelling && isRawatib(item.trigger)) return false
    return true
  })
}

function reasonFor(item: Item, signals: Signals, window: PrayerWindow | null): PlanReason | null {
  const { trigger } = item

  switch (trigger.kind) {
    case 'event':
      return signals.activeEvents.includes(trigger.event) ? 'active-event' : null

    case 'window': {
      const current = window ? WINDOW_FOR[window.name] : undefined
      return current === trigger.window ? 'current-window' : null
    }

    case 'prayer': {
      const prayed = Object.keys(signals.prayedToday)

      if (trigger.when === 'after') {
        const done = trigger.prayer === 'any' ? prayed.length > 0 : prayed.includes(trigger.prayer)
        return done ? 'after-prayer' : null
      }

      if (!window) return null

      // A prayer's "before" belongs to the window that leads into it, not to
      // any moment the prayer happens to be unmarked.
      if (trigger.prayer === 'any') {
        const current = PRAYER_FOR_WINDOW[window.name]
        return current && !prayed.includes(current) ? 'before-prayer' : null
      }

      const approaching = PRECEDING_WINDOW[trigger.prayer] === window.name
      return approaching && !prayed.includes(trigger.prayer) ? 'before-prayer' : null
    }

    case 'day':
      return matchesDay(trigger.day, signals.today) ? 'today' : null

    default:
      return assertNever(trigger)
  }
}

function byRelevance(items: Item[]): (left: PlannedItem, right: PlannedItem) => number {
  const rulingOf = (id: string): number => {
    const item = items.find((candidate) => candidate.id === id)
    return item ? RULING_RANK[item.ruling] : RULING_RANK.mubah
  }

  return (left, right) =>
    REASON_RANK[left.reason] - REASON_RANK[right.reason] ||
    rulingOf(left.itemId) - rulingOf(right.itemId)
}

function lookAhead(items: Item[], upcoming: DayContext[], signals: Signals): PlannedItem[] {
  return upcoming.flatMap((day, index) =>
    items
      .filter((item) => item.trigger.kind === 'day' && matchesDay(item.trigger.day, day))
      .map((item) => ({
        itemId: item.id,
        reason: 'upcoming' as const,
        daysAway: index + 1,
        optional: isOptional(item, signals),
        caveat: caveatFor(item, day),
      })),
  )
}

function futureWindows(signals: Signals): PrayerWindow[] {
  return buildWindows(signals.prayerTimes).filter((window) => window.startsAt > signals.now)
}

/**
 * A category decides by default; a per-item override wins when present. Known
 * items leave the rotation, which is what keeps the daily budget flat as the
 * user enables more content.
 */
function isRemindable(item: Item, signals: Signals, category: 'windows' | 'lookAhead'): boolean {
  const { notifications, knownItemIds } = signals.preferences
  if (knownItemIds.includes(item.id)) return false

  const override = notifications.perItem[item.id]
  return override ?? notifications[category]
}

function scheduleNotifications(signals: Signals, items: Item[]): ScheduledNotification[] {
  const { notifications } = signals.preferences
  const perDay = new Map<string, number>()
  const scheduled: ScheduledNotification[] = []

  const take = (at: Date, itemId: string, reason: PlanReason): void => {
    if (isQuiet(at, signals.timeZone, notifications.quietHours)) return

    const day = civilDateIn(at, signals.timeZone)
    const key = `${day.year}-${day.month}-${day.day}`
    const used = perDay.get(key) ?? 0
    if (used >= notifications.maxPerDay) return
    if (scheduled.length >= MAX_PENDING_NOTIFICATIONS) return
    perDay.set(key, used + 1)
    scheduled.push({ itemId, at, reason })
  }

  futureWindows(signals).forEach((window) => {
    const name = WINDOW_FOR[window.name]
    if (name) {
      items
        .filter((item) => item.trigger.kind === 'window' && item.trigger.window === name)
        .filter((item) => isRemindable(item, signals, 'windows'))
        .forEach((item) => take(window.startsAt, item.id, 'current-window'))
    }

    // Look-ahead goes out the evening before, while there is still time to prepare.
    if (window.name !== 'asr') return
    const eve = civilDateIn(window.startsAt, signals.timeZone)
    const tomorrow = signals.upcoming.find((day) => isSameCivilDate(day.civil, shiftDays(eve, 1)))
    if (!tomorrow) return

    items
      .filter((item) => item.trigger.kind === 'day' && matchesDay(item.trigger.day, tomorrow))
      .filter((item) => isRemindable(item, signals, 'lookAhead'))
      .forEach((item) => take(window.startsAt, item.id, 'upcoming'))
  })

  return scheduled
}

/**
 * The one decision boundary. Everything the product decides comes out of here,
 * from a snapshot that contains no clock, no device and no storage.
 */
export function plan(signals: Signals): Plan {
  const items = availableItems(signals)
  const window = windowAt(signals.now, buildWindows(signals.prayerTimes))

  const relevant: PlannedItem[] = items.flatMap((item) => {
    const reason = reasonFor(item, signals, window)
    if (!reason) return []
    return [
      {
        itemId: item.id,
        reason,
        optional: isOptional(item, signals),
        caveat: caveatFor(item, signals.today),
      },
    ]
  })

  const ranked = [...relevant].sort(byRelevance(items))
  // A calendar day is never the right-now card: fasting tomorrow is something
  // to prepare for, not something to do at this moment.
  const [rightNow = null] = ranked.filter((entry) => entry.reason !== 'today')

  return {
    today: {
      hijri: signals.today.hijri,
      window: window?.name ?? null,
      rightNow,
      context: ranked.filter(
        (entry) => entry.reason === 'active-event' && entry.itemId !== rightNow?.itemId,
      ),
      comingUp: [
        ...ranked.filter((entry) => entry.reason === 'today'),
        ...lookAhead(items, signals.upcoming, signals),
      ],
    },
    notifications: scheduleNotifications(signals, items),
  }
}
