// Wires the app's own pure domain code — the same `plan()` that decides what
// the real Today screen shows — into view models the demo's DOM renderers can
// read directly. Mirrors the assembly in src/app/(home)/index.tsx and
// src/widgets/model.ts, but for the browser: no storage, no device, state
// lives in site/demo/state.ts.

import { itemById, items, resolveText } from '@/content'
import { civilDateIn, civilDateKey } from '@/day/boundaries'
import { dayContextFor } from '@/plan/day-context'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/plan/notification-preferences'
import { attendsJumuah, prayerName, windowName } from '@/plan/jumuah'
import { plan } from '@/plan/plan'
import type { NextPrayer, PlannedItem, Signals } from '@/plan/signals'
import { DEFAULT_USER_STATE } from '@/plan/user-state'
import type { Place } from '@/location/place'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows } from '@/prayer/windows'
import type { Strings } from '@/strings/en'

/** How many days of look-ahead the demo offers under "Later this week". */
const HORIZON_DAYS = 7

export type PrayerMarks = Partial<Record<Prayer, Date>>

export interface TodayEntry {
  id: string
  title: string
  detail: string | null
}

export interface NextPrayerEntry {
  prayer: Prayer
  /** Jumu'ah in place of Dhuhr on a Friday. */
  name: string
  distance: string
  before: TodayEntry[]
  after: TodayEntry[]
}

export interface PrayerEntry {
  prayer: Prayer
  /** Jumu'ah in place of Dhuhr on a Friday. */
  name: string
  done: boolean
  passed: boolean
}

export interface TodayViewModel {
  windowTitle: string
  gregorian: string
  hijri: string
  placeLabel: string
  prayers: PrayerEntry[]
  rightNow: TodayEntry | null
  alsoNow: TodayEntry[]
  nothingElse: boolean
  next: NextPrayerEntry | null
  allDay: TodayEntry[]
  tomorrow: TodayEntry[]
  later: TodayEntry[]
}

/**
 * Everything `plan()` needs, for one instant. Recomputed from scratch on every
 * slider move — the same shape `src/widgets/model.test.ts` builds for a test,
 * just built fresh for whichever moment the visitor is looking at rather than
 * pinned to one.
 */
export function buildSignals(place: Place, at: Date, marks: PrayerMarks): Signals {
  const timeZone = place.timeZone
  const prayerTimes = prayerTimesAcross(place, at, DEFAULT_CALCULATION_PREFERENCES, 3)
  const dayKey = civilDateKey(civilDateIn(at, timeZone))
  const maghrib =
    prayerTimes.find((day) => civilDateKey(civilDateIn(day.maghrib, timeZone)) === dayKey)
      ?.maghrib ?? null

  // A mark belongs to the civil day it was made on, same as the real app's
  // rollover: moving the slider onto a different day must not carry yesterday's
  // marks forward.
  const prayedToday: PrayerMarks = {}
  for (const prayer of PRAYERS) {
    const mark = marks[prayer]
    if (mark && civilDateKey(civilDateIn(mark, timeZone)) === dayKey) prayedToday[prayer] = mark
  }

  return {
    now: at,
    timeZone,
    items,
    prayerTimes,
    today: dayContextFor(at, timeZone, 0, 0, maghrib),
    upcoming: Array.from({ length: HORIZON_DAYS }, (_, index) =>
      dayContextFor(at, timeZone, index + 1, 0, null),
    ),
    prayedToday,
    completedToday: {},
    activeEvents: [],
    userState: DEFAULT_USER_STATE,
    // A visitor has no onboarding answer, so the default resolves as it would
    // for someone who skipped the question: Jumu'ah on Fridays.
    attendsJumuah: attendsJumuah(
      DEFAULT_USER_STATE.jumuah,
      DEFAULT_USER_STATE.travelling,
      'unspecified',
    ),
    preferences: {
      enabledItemIds: items.filter((item) => item.defaultOn).map((item) => item.id),
      knownItemIds: [],
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  }
}

export function toggleMark(marks: PrayerMarks, prayer: Prayer, at: Date): PrayerMarks {
  if (marks[prayer]) {
    const next = { ...marks }
    delete next[prayer]
    return next
  }
  return { ...marks, [prayer]: at }
}

function itemEntry(id: string): TodayEntry | null {
  const item = itemById(id)
  return item ? { id, title: resolveText(item.title) ?? id, detail: null } : null
}

function caveatLabel(caveat: PlannedItem['caveat'], strings: Strings): string | null {
  if (caveat === 'confirm-locally') return strings.plan.confirmLocally
  if (caveat === 'expected') return strings.plan.expected
  return null
}

function whenLabel(planned: PlannedItem, strings: Strings): string | null {
  if (planned.reason !== 'upcoming') return null
  return planned.daysAway === 1 ? strings.plan.tomorrow : strings.plan.inDays(planned.daysAway ?? 0)
}

function detailFor(planned: PlannedItem, strings: Strings, showWhen: boolean): string | null {
  const parts = [
    showWhen ? whenLabel(planned, strings) : null,
    planned.optional ? strings.plan.optional : null,
    caveatLabel(planned.caveat, strings),
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(' · ') : null
}

function toEntry(planned: PlannedItem, strings: Strings, showWhen = true): TodayEntry | null {
  const item = itemById(planned.itemId)
  if (!item) return null

  return {
    id: planned.itemId,
    title: resolveText(item.title) ?? item.id,
    detail: detailFor(planned, strings, showWhen),
  }
}

/** A rough distance, never a clock time: the app says how the day feels, not when it ticks. */
export function distanceLabel(minutes: number, strings: Strings): string {
  if (minutes < 45) return strings.plan.soon
  if (minutes < 90) return strings.plan.inAboutAnHour
  return strings.plan.inAboutHours(Math.round(minutes / 60))
}

function toNext(next: NextPrayer | null, now: Date, strings: Strings): NextPrayerEntry | null {
  if (!next) return null
  return {
    prayer: next.prayer,
    name: prayerName(strings, next.prayer, next.jumuah),
    distance: distanceLabel((next.startsAt.getTime() - now.getTime()) / 60_000, strings),
    before: next.before.flatMap((id) => itemEntry(id) ?? []),
    after: next.after.flatMap((id) => itemEntry(id) ?? []),
  }
}

function soonestEach(entries: PlannedItem[]): PlannedItem[] {
  const soonest = new Map<string, PlannedItem>()

  for (const entry of entries) {
    const seen = soonest.get(entry.itemId)
    if (!seen || (entry.daysAway ?? 0) < (seen.daysAway ?? 0)) soonest.set(entry.itemId, entry)
  }

  return [...soonest.values()].sort((a, b) => (a.daysAway ?? 0) - (b.daysAway ?? 0))
}

interface Ahead {
  allDay: PlannedItem[]
  tomorrow: PlannedItem[]
  later: PlannedItem[]
}

function split(entries: PlannedItem[]): Ahead {
  return {
    allDay: entries.filter((entry) => entry.reason === 'today'),
    tomorrow: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && entry.daysAway === 1),
    ),
    later: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && (entry.daysAway ?? 0) > 1),
    ),
  }
}

export function buildToday(
  signals: Signals,
  strings: Strings,
  locale: string,
  placeLabel: string,
): TodayViewModel {
  const planned = plan(signals)
  const windows = buildWindows(signals.prayerTimes)
  const window = planned.today.window
  const dayKey = civilDateKey(civilDateIn(signals.now, signals.timeZone))

  const passed = (prayer: Prayer): boolean =>
    windows.some(
      (entry) =>
        entry.name === prayer &&
        entry.endsAt <= signals.now &&
        civilDateKey(civilDateIn(entry.startsAt, signals.timeZone)) === dayKey,
    )

  const [rightNowPlanned = null, ...alsoNowPlanned] = planned.today.now
  const rightNow = rightNowPlanned ? toEntry(rightNowPlanned, strings) : null
  const alsoNow = alsoNowPlanned.flatMap((entry) => toEntry(entry, strings) ?? [])

  const ahead = split(planned.today.comingUp)
  const allDay = ahead.allDay.flatMap((entry) => toEntry(entry, strings, false) ?? [])
  const tomorrow = ahead.tomorrow.flatMap((entry) => toEntry(entry, strings, false) ?? [])
  const later = ahead.later.flatMap((entry) => toEntry(entry, strings) ?? [])

  const next = toNext(planned.today.next, signals.now, strings)

  const nothingElse =
    !rightNow &&
    alsoNow.length === 0 &&
    allDay.length === 0 &&
    tomorrow.length === 0 &&
    later.length === 0 &&
    !(next && (next.before.length > 0 || next.after.length > 0))

  const hijri = signals.today.hijri

  return {
    windowTitle: window ? windowName(strings, window, planned.today.jumuah) : strings.today.title,
    gregorian: new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: signals.timeZone,
    }).format(signals.now),
    hijri: strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year),
    placeLabel,
    prayers: PRAYERS.map((prayer) => ({
      prayer,
      name: prayerName(strings, prayer, planned.today.jumuah),
      done: signals.prayedToday[prayer] !== undefined,
      passed: passed(prayer),
    })),
    rightNow,
    alsoNow,
    nothingElse,
    next,
    allDay,
    tomorrow,
    later,
  }
}
