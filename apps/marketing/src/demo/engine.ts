// Adapts the app's own pure domain code — the same `plan()` that decides what
// the real Today screen shows — into the props of @ihsaanly/ui's shared
// screens. Mirrors the route containers in apps/mobile/src/app ((home)/index,
// (library)/index, (library)/item/[id], (more)/index) and more/rows.ts, but
// for the browser: no storage, no device, state lives in state.ts.

import { resolveText } from '@ihsaanly/core/content/language'
import type { Item } from '@ihsaanly/core/content/schema'
import { groupByCategory, searchItems } from '@ihsaanly/core/content/search'
import { formatShareText, sourceFor } from '@ihsaanly/core/content/share-text'
import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import type { Place } from '@ihsaanly/core/location/place'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { attendsJumuah, prayerNames, windowName } from '@ihsaanly/core/plan/jumuah'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import { plan } from '@ihsaanly/core/plan/plan'
import type { Signals } from '@ihsaanly/core/plan/signals'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '@ihsaanly/core/prayer/calculation'
import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, type WindowName } from '@ihsaanly/core/prayer/windows'
import type { Strings } from '@ihsaanly/core/strings/en'
import { cardFor, remindFor } from '@ihsaanly/ui/props/item'
import { passes } from '@ihsaanly/ui/props/library'
import { moreGroups } from '@ihsaanly/ui/props/more'
import {
  markFor,
  type ProgressSoFar,
  panelFor,
  soonestEach,
  toEntry,
  toNext,
} from '@ihsaanly/ui/props/today'
import type { ItemDetail, ItemScreenProps } from '@ihsaanly/ui/screens/item'
import type {
  LibraryFilter,
  LibraryScreenProps,
  LibrarySectionView,
} from '@ihsaanly/ui/screens/library'
import type { TodayEntry, TodayScreenProps } from '@ihsaanly/ui/screens/today'
import type { MoreGroup } from '@ihsaanly/ui/types'
import { demoItemById, demoItems } from './demo-content'

/** How many days of look-ahead the demo offers under "Later this week". */
const HORIZON_DAYS = 7

export type PrayerMarks = Partial<Record<Prayer, Date>>
export type Completions = Partial<Record<string, Date>>
/** Taps counted and part ids said so far, per item. */
export type Progress = Partial<Record<string, ProgressSoFar>>

const NO_PROGRESS: ProgressSoFar = { count: 0, parts: [] }

/** Today's UI state that is not a mark: how far stepped items have got, and the open sheet. */
export interface TodayView {
  progress: Progress
  panelItemId: string | null
}

/** A screen's props without its callbacks: the host wires those to the reducer. */
export type Data<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K]
}

export interface DemoToday {
  props: Data<TodayScreenProps>
  /** The app bar title: the current window's name, as the app's Stack.Screen shows it. */
  title: string
  /** The prayer whose window is open right now, or null at a boundary (sunrise). */
  currentPrayer: Prayer | null
  names: Record<Prayer, string>
}

export interface DemoUser {
  marks: PrayerMarks
  completed: Completions
  enabled: string[]
}

export const DEFAULT_ENABLED: string[] = demoItems()
  .filter((item) => item.defaultOn)
  .map((item) => item.id)

function onDay<K extends string>(
  marks: Partial<Record<K, Date>>,
  dayKey: string,
  timeZone: string,
): Partial<Record<K, Date>> {
  const kept: Partial<Record<K, Date>> = {}
  for (const [key, mark] of Object.entries(marks) as [K, Date | undefined][]) {
    if (mark && civilDateKey(civilDateIn(mark, timeZone)) === dayKey) kept[key] = mark
  }
  return kept
}

/** Everything `plan()` needs, for one instant — built fresh on every tick. */
export function buildSignals(place: Place, at: Date, user: DemoUser): Signals {
  const timeZone = place.timeZone
  const prayerTimes = prayerTimesAcross(place, at, DEFAULT_CALCULATION_PREFERENCES, 3)
  const dayKey = civilDateKey(civilDateIn(at, timeZone))
  const maghrib =
    prayerTimes.find((day) => civilDateKey(civilDateIn(day.maghrib, timeZone)) === dayKey)
      ?.maghrib ?? null

  return {
    now: at,
    timeZone,
    items: demoItems(),
    prayerTimes,
    today: dayContextFor(at, timeZone, 0, 0, maghrib),
    upcoming: Array.from({ length: HORIZON_DAYS }, (_, index) =>
      dayContextFor(at, timeZone, index + 1, 0, null),
    ),
    // A mark belongs to the civil day it was made on, same as the app's rollover.
    prayedToday: onDay(user.marks, dayKey, timeZone),
    completedToday: onDay(user.completed, dayKey, timeZone),
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
      enabledItemIds: user.enabled,
      knownItemIds: [],
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  }
}

export function toggleMark<K extends string>(
  marks: Partial<Record<K, Date>>,
  key: K,
  at: Date,
): Partial<Record<K, Date>> {
  if (marks[key]) {
    const next = { ...marks }
    delete next[key]
    return next
  }
  return { ...marks, [key]: at }
}

/** Sunrise is a boundary, not a prayer — the same rule `nextPrayerWindow` follows. */
function currentPrayerFor(window: WindowName | null): Prayer | null {
  if (window === null || window === 'sunrise') return null
  return window
}

function nextWithMarks(
  next: ReturnType<typeof toNext>,
  withMark: (entry: TodayEntry) => TodayEntry,
): ReturnType<typeof toNext> {
  return next && { ...next, before: next.before.map(withMark), after: next.after.map(withMark) }
}

export function buildToday(
  signals: Signals,
  strings: Strings,
  locale: string,
  placeLabel: string,
  view: TodayView = { progress: {}, panelItemId: null },
): DemoToday {
  const planned = plan(signals)
  const windows = buildWindows(signals.prayerTimes)
  const window = planned.today.window
  const { now, timeZone } = signals
  const dayKey = civilDateKey(civilDateIn(now, timeZone))
  const upcoming = planned.today.comingUp.filter((entry) => entry.reason === 'upcoming')

  const withMark = (entry: TodayEntry): TodayEntry => {
    const item = demoItemById(entry.id)
    return item
      ? { ...entry, mark: markFor(item, false, view.progress[entry.id] ?? NO_PROGRESS) }
      : entry
  }
  const panelItem = view.panelItemId ? demoItemById(view.panelItemId) : undefined

  const passed = (prayer: Prayer): boolean =>
    windows.some(
      (entry) =>
        entry.name === prayer &&
        entry.endsAt <= now &&
        civilDateKey(civilDateIn(entry.startsAt, timeZone)) === dayKey,
    )

  return {
    title: window ? windowName(strings, window, planned.today.jumuah) : strings.today.title,
    currentPrayer: currentPrayerFor(window),
    names: prayerNames(strings, planned.today.jumuah),
    props: {
      hasLocation: true,
      locating: false,
      locationProblem: null,
      jumuah: planned.today.jumuah,
      suggestion: null,
      qadaHref: '/qada',
      gregorian: new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone,
      }).format(now),
      hijri: planned.today.hijri,
      placeLabel,
      now: planned.today.now
        .flatMap((entry) => toEntry(entry, strings, demoItemById) ?? [])
        .map(withMark),
      next: nextWithMarks(toNext(planned.today.next, now, strings, demoItemById), withMark),
      allDay: planned.today.comingUp
        .filter((entry) => entry.reason === 'today')
        .flatMap((entry) => toEntry(entry, strings, demoItemById, false) ?? [])
        .map(withMark),
      tomorrow: soonestEach(upcoming.filter((entry) => entry.daysAway === 1)).flatMap(
        (entry) => toEntry(entry, strings, demoItemById, false) ?? [],
      ),
      later: soonestEach(upcoming.filter((entry) => (entry.daysAway ?? 0) > 1)).flatMap(
        (entry) => toEntry(entry, strings, demoItemById) ?? [],
      ),
      doneToday: planned.today.done
        .filter((entry) => entry.reason !== 'upcoming')
        .flatMap((entry) => toEntry(entry, strings, demoItemById, false) ?? [])
        .map((entry) => ({ ...entry, mark: { done: true, progress: null } })),
      undo: null,
      panel: panelItem ? panelFor(panelItem, view.progress[panelItem.id] ?? NO_PROGRESS) : null,
      // The demo has its own coach, no pause and no cloud: nothing else to teach.
      prayerHint: false,
      tour: null,
      paused: false,
      checkIn: null,
      prayers: PRAYERS.map((prayer) => ({
        prayer,
        done: signals.prayedToday[prayer] !== undefined,
        passed: passed(prayer),
      })),
      qada: [],
      fastingToday: null,
      fastsOwed: 0,
      locationHref: '/location',
    },
  }
}

export function buildLibrary(
  query: string,
  filter: LibraryFilter,
  enabled: string[],
  strings: Strings,
): Data<LibraryScreenProps> {
  const matching = searchItems(demoItems(), query)
  const labelOf = (category: string): string => strings.category[category] ?? category
  // A visitor has memorised nothing yet.
  const sections: LibrarySectionView[] = groupByCategory(
    matching.filter((item) => passes(item, filter, enabled, [])),
  )
    .map((section) => ({
      category: section.category,
      entries: section.items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        ruling: item.ruling,
        href: `/item/${item.id}`,
        onToday: enabled.includes(item.id),
        known: false,
      })),
    }))
    .sort((left, right) => labelOf(left.category).localeCompare(labelOf(right.category)))

  return {
    query,
    filter,
    counts: {
      all: matching.length,
      onToday: matching.filter((item) => enabled.includes(item.id)).length,
      known: 0,
    },
    sections,
    glossaryHref: '/glossary',
  }
}

function detailOf(item: Item, strings: Strings): ItemDetail {
  return {
    ruling: item.ruling,
    rulingHref: `/glossary?term=${item.ruling}`,
    reviewed: item.reviewed,
    why: resolveText(item.why),
    how: item.how.flatMap((step) => resolveText(step) ?? []),
    repeat: item.repeat,
    arabic: item.arabic,
    transliteration: resolveText(item.transliteration),
    translation: resolveText(item.translation),
    note: resolveText(item.note),
    evidence: item.evidence,
    parts: (item.parts ?? []).map((part) => ({
      id: part.id,
      title: resolveText(part.title) ?? part.id,
      arabic: part.arabic,
      transliteration: resolveText(part.transliteration),
      translation: resolveText(part.translation),
      repeat: part.repeat,
      source: part.evidence.map((evidence) => sourceFor(evidence, strings)).join(' · '),
    })),
  }
}

export interface ItemInput {
  id: string | null
  signals: Signals
  count: number
  remind: Partial<Record<string, boolean>>
  enabled: string[]
}

export function buildItem(input: ItemInput, strings: Strings): Data<ItemScreenProps> {
  const item = input.id ? demoItemById(input.id) : undefined
  const title = (item ? resolveText(item.title) : null) ?? strings.notFound.title
  if (!item) {
    return {
      title,
      item: null,
      memoriseHref: null,
      done: false,
      counter: null,
      onToday: false,
      remind: null,
    }
  }

  const isEnabled = input.enabled.includes(item.id)
  // Open in the plan means the completion, if any, belongs to an earlier occasion.
  const open = plan(input.signals).today.now.some((entry) => entry.itemId === item.id)
  return {
    title,
    item: detailOf(item, strings),
    memoriseHref: item.arabic ? `/item/memorise/${item.id}` : null,
    done: input.signals.completedToday[item.id] !== undefined && !open,
    counter: item.repeat > 1 ? { count: input.count, target: item.repeat } : null,
    onToday: isEnabled,
    remind: remindFor(
      item,
      isEnabled,
      false,
      input.remind,
      DEFAULT_NOTIFICATION_PREFERENCES,
      strings,
    ),
  }
}

/** More's rows as the app's more/rows.ts builds them, at a first launch's defaults. */
export function buildMore(
  strings: Strings,
  language: SupportedLanguage,
  placeLabel: string,
): MoreGroup[] {
  return moreGroups({
    strings,
    placeLabel,
    asr: DEFAULT_CALCULATION_PREFERENCES.asr,
    hijriOffset: 0,
    travelling: false,
    trackingPaused: false,
    language,
    theme: 'system',
    qadaOwed: 0,
  })
}

/** The text the app's "Share as text" sends, as its item route builds it. */
export function shareTextFor(id: string, strings: Strings): string | null {
  const item = demoItemById(id)
  if (!item) return null
  return formatShareText(cardFor(item, strings), strings)
}
