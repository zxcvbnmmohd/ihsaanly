import type { CivilDate } from '@/day/boundaries'
import type { Item } from '@/content/schema'
import type { HijriDate } from '@/hijri/calendar'
import type { DailyPrayerTimes, WindowName } from '@/prayer/windows'

export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

/** One calendar day, already converted, so the planner does no timezone maths. */
export interface DayContext {
  civil: CivilDate
  hijri: HijriDate
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number
}

export interface UserState {
  /** Manual. On a journey the rawatib drop and fasting becomes optional. */
  travelling: boolean
  /** Manual. No prayer items, no make-up; missed fasts are still owed. */
  trackingPaused: boolean
}

export interface Preferences {
  enabledItemIds: string[]
  /** Memorised. Stays in the Library, leaves the reminder rotation. */
  knownItemIds: string[]
  maxNotificationsPerDay: number
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
  /** Only set for 'upcoming', so the screen can say when without doing maths. */
  daysAway?: number
}

export interface TodayModel {
  window: WindowName | null
  rightNow: PlannedItem | null
  context: PlannedItem[]
  comingUp: PlannedItem[]
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
