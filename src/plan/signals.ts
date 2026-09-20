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
  activeEvents: string[]
  userState: UserState
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
  startsAt: Date
  before: string[]
  after: string[]
}

export interface TodayModel {
  hijri: HijriDate
  window: WindowName | null
  /** Everything that applies right now, best first. `rightNow` is its head. */
  now: PlannedItem[]
  rightNow: PlannedItem | null
  context: PlannedItem[]
  comingUp: PlannedItem[]
  next: NextPrayer | null
}

export interface ScheduledNotification {
  itemId: string
  at: Date
  reason: PlanReason
}

export interface Plan {
  today: TodayModel
  notifications: ScheduledNotification[]
}
