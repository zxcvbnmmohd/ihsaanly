import type { CivilDate } from '@/day/boundaries'
import type { Item } from '@/content/schema'
import type { HijriDate } from '@/hijri/calendar'
import type { DailyPrayerTimes, WindowName } from '@/prayer/windows'

import type { NotificationPreferences } from './notification-preferences'
import type { UserState } from './user-state'

export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

/** One calendar day, already converted, so the planner does no timezone maths. */
export interface DayContext {
  civil: CivilDate
  /** The user's calendar, after their offset. */
  hijri: HijriDate
  /** Umm al-Qura with no offset, which is what Makkah follows. */
  hijriCalculated: HijriDate
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number
}

export interface Preferences {
  enabledItemIds: string[]
  /** Memorised. Stays in the Library, leaves the reminder rotation. */
  knownItemIds: string[]
  notifications: NotificationPreferences
}

/**
 * Everything the planner is allowed to know. Assembled at the edge by adapters
 * that touch the clock, the device and storage; the planner itself touches none
 * of them, which is what makes it testable without a simulator.
 */
export interface Signals {
  now: Date
  timeZone: string
  items: Item[]
  /** Consecutive days, earliest first, spanning at least yesterday to tomorrow. */
  prayerTimes: DailyPrayerTimes[]
  today: DayContext
  upcoming: DayContext[]
  prayedToday: Partial<Record<Prayer, Date>>
  /** Items marked done today, with the moment of the mark. */
  completedToday: Partial<Record<string, Date>>
  activeEvents: string[]
  userState: UserState
  /**
   * Whether this user prays Jumu'ah rather than Dhuhr on a Friday, resolved at
   * the edge by `attendsJumuah` so the planner never learns the onboarding
   * gender it is derived from.
   */
  attendsJumuah: boolean
  preferences: Preferences
}

export type PlanReason =
  'active-event' | 'current-window' | 'after-prayer' | 'before-prayer' | 'today' | 'upcoming'

export interface PlannedItem {
  itemId: string
  reason: PlanReason
  /** Recommended but not expected of you today, as fasting is on a journey. */
  optional?: boolean
  /** Only set for 'upcoming', so the screen can say when without doing maths. */
  daysAway?: number
  /**
   * A calculated date is never asserted. 'confirm-locally' additionally means
   * the user's calendar and the calculated one disagree about this day.
   */
  caveat?: 'expected' | 'confirm-locally'
}

/** What the next prayer asks of you, from content rather than from the moment. */
export interface NextPrayer {
  prayer: Prayer
  /** The prayer falls on the user's Jumu'ah day, so a dhuhr is named Jumu'ah. */
  jumuah: boolean
  startsAt: Date
  before: string[]
  after: string[]
}

export interface TodayModel {
  hijri: HijriDate
  window: WindowName | null
  /** Today is the user's Jumu'ah day: name Dhuhr and its window Jumu'ah. */
  jumuah: boolean
  /** Everything that applies right now, best first. `rightNow` is its head. */
  now: PlannedItem[]
  /** Relevant right now but already done for this occasion. */
  done: PlannedItem[]
  rightNow: PlannedItem | null
  context: PlannedItem[]
  comingUp: PlannedItem[]
  next: NextPrayer | null
}

/** An item reminder carries the window it belongs to, so the words and a snooze can respect its end. */
export interface ItemNotification {
  kind: 'item'
  itemId: string
  at: Date
  reason: PlanReason
  /** `jumuah` says the closing prayer is a Friday's Jumu'ah, so the words name it so. */
  window: { closes: Prayer; endsAt: Date; jumuah: boolean } | null
}

/** One per prayer window opening, only when the user asked for them. */
export interface PrayerNotification {
  kind: 'prayer'
  prayer: Prayer
  /** This window opens on the user's Jumu'ah day. */
  jumuah: boolean
  at: Date
}

export type ScheduledNotification = ItemNotification | PrayerNotification

export interface Plan {
  today: TodayModel
  notifications: ScheduledNotification[]
}
