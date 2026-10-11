import { itemById, items, resolveText } from '@ihsaanly/core/content'
import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { prayerName, windowName } from '@ihsaanly/core/plan/jumuah'
import { plan } from '@ihsaanly/core/plan/plan'
import type { PlannedItem, Signals } from '@ihsaanly/core/plan/signals'
import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import { buildWindows, windowAt } from '@ihsaanly/core/prayer/windows'
import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@/theme/palettes'

/**
 * Everything every widget can show, resolved to plain strings and hex colours.
 * Widgets run where there is no app state, no strings table and no
 * PlatformColor — an iOS widget's runtime is isolated, an Android widget
 * renders to RemoteViews — so the app does all of the thinking here and hands
 * over a timeline of these. A pure function, so a test can pin what a widget
 * says at any moment.
 */
export interface WidgetLink {
  title: string
  detail: string | null
  url: string
}

/** The moment's headline item: a link, plus the id a done tap is filed under. */
export interface WidgetItem extends WidgetLink {
  id: string
}

/**
 * A done tap on the Right now widget, kept in the widget's own timeline (the
 * App Group) until the app takes it into its log. `at` is the tap's epoch ms,
 * from which the app files it under the right day, as any mark is.
 */
export interface WidgetTap {
  id: string
  at: number
}

export interface WidgetInk {
  background: string
  backgroundEnd: string
  surface: string
  accent: string
  onAccent: string
  label: string
  secondaryLabel: string
}

export interface WidgetModel {
  /** Epoch ms from which this entry applies. */
  at: number
  /** Past the end of the timeline: the widget only asks for the app to be opened. */
  stale: boolean
  rtl: boolean
  ink: { light: WidgetInk; dark: WidgetInk }
  labels: {
    app: string
    rightNow: string
    upNext: string
    prayers: string
    hijri: string
    alsoToday: string
    quickDuas: string
    duaOfTheDay: string
    makeUp: string
    comingUp: string
    nothingNow: string
    nothingOwed: string
    openApp: string
    before: string
    after: string
    markDone: string
    markedDone: string
  }
  /** "Morning", "After Maghrib"; null before the first prayer is calculable. */
  window: string | null
  /** "Open for about 2 more hours", "Closing soon": never a clock time. Null outside a window. */
  remaining: string | null
  /**
   * When this moment opened, epoch ms. Never shown: a widget compares a tap
   * against it, so a tap for an earlier occasion of the same item (the tasbih
   * after Dhuhr, seen again after Asr) does not read as done.
   */
  openedAt: number | null
  /** `hijriDay` is the bare number, for a circle too small for the formatted date. */
  date: { gregorian: string; hijri: string; hijriDay: number; place: string | null }
  rightNow: WidgetItem | null
  alsoNow: WidgetLink[]
  /** "+2 more now": what else is open beside the headline; null when nothing is. */
  moreNow: string | null
  /** Done taps the app has not taken in yet. Always empty from the app; the widget appends. */
  taps: WidgetTap[]
  next: { prayer: string; distance: string; before: WidgetLink[]; after: WidgetLink[] } | null
  /** Empty when tracking is paused. */
  prayers: { name: string; short: string; done: boolean; passed: boolean }[]
  allDay: WidgetLink[]
  comingUp: WidgetLink[]
  quickDuas: WidgetLink[]
  duaOfTheDay: { title: string; arabic: string; translation: string | null; url: string } | null
  makeUp: { prayers: number; fasts: number; summary: string | null; url: string }
}

export interface WidgetInput {
  signals: Signals
  strings: Strings
  locale: string
  rtl: boolean
  placeLabel: string | null
  hijriOffset: number
  qada: Partial<Record<Prayer, number>>
  fastsOwed: number
}

const STEP_MS = 30 * 60_000
const HORIZON_MS = 24 * 60 * 60_000

/** The events a phone cannot detect, which is what the quick widget is for. */
const UNDETECTABLE = ['ascending', 'descending', 'leaving-home', 'travel']

function itemUrl(id: string): string {
  return `ihsaanly://item/${id}`
}

function link(id: string, detail: string | null = null): WidgetLink | null {
  const item = itemById(id)
  if (!item) return null
  return { title: resolveText(item.title) ?? id, detail, url: itemUrl(id) }
}

function inkFor(scheme: 'light' | 'dark'): WidgetInk {
  const palette = palettes[scheme]
  return {
    background: palette.wash[0],
    backgroundEnd: palette.wash[1],
    surface: palette.widgetSurface,
    accent: palette.accent,
    onAccent: palette.onAccent,
    label: palette.ink,
    secondaryLabel: palette.inkSecondary,
  }
}

type Rough = { kind: 'soon' } | { kind: 'hour' } | { kind: 'hours'; hours: number }

/**
 * Minutes to a rough distance. Each phrase holds until its boundary is reached
 * (45 minutes left is already "soon"), so a timeline entry placed exactly on a
 * boundary shows the phrase that follows it: see `ROUGH_TURNS`.
 */
function rough(minutes: number): Rough {
  if (minutes <= 45) return { kind: 'soon' }
  if (minutes <= 90) return { kind: 'hour' }
  return { kind: 'hours', hours: Math.ceil(minutes / 60 - 0.5) }
}

/** Minutes before a moment at which `rough` turns to its next phrase: 45, 90, 150, 210… */
const ROUGH_TURNS = [45, 90, ...Array.from({ length: 23 }, (_, index) => (index + 2) * 60 + 30)]

/** A rough distance, never a clock time: the app says how the day feels, not when it ticks. */
export function distanceLabel(minutes: number, strings: Strings): string {
  const distance = rough(minutes)
  if (distance.kind === 'soon') return strings.plan.soon
  if (distance.kind === 'hour') return strings.plan.inAboutAnHour
  return strings.plan.inAboutHours(distance.hours)
}

/** How long the moment stays open, in the same rough words. */
export function remainingLabel(minutes: number, strings: Strings): string {
  const distance = rough(minutes)
  if (distance.kind === 'soon') return strings.widgets.closingSoon
  if (distance.kind === 'hour') return strings.widgets.openAboutAnHour
  return strings.widgets.openAboutHours(distance.hours)
}

function whenLabel(planned: PlannedItem, strings: Strings): string | null {
  if (planned.reason !== 'upcoming') return null
  return planned.daysAway === 1 ? strings.plan.tomorrow : strings.plan.inDays(planned.daysAway ?? 0)
}

/** One per civil day, so the widget and a friend's phone agree on today's dua. */
function duaOfTheDay(dayKey: string): WidgetModel['duaOfTheDay'] {
  const candidates = items.filter((item) => item.arabic !== null)
  if (candidates.length === 0) return null
  const dayNumber = Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000)
  const item = candidates[dayNumber % candidates.length]
  if (!item?.arabic) return null
  return {
    title: resolveText(item.title) ?? item.id,
    arabic: item.arabic,
    translation: resolveText(item.translation),
    url: itemUrl(item.id),
  }
}

function modelAt(input: WidgetInput, at: Date): WidgetModel {
  const { strings, signals } = input
  const timeZone = signals.timeZone
  const dayKey = civilDateKey(civilDateIn(at, timeZone))
  const sameDay = dayKey === civilDateKey(civilDateIn(signals.now, timeZone))

  // The day moves on under a widget, so each entry gets the day it falls in.
  // Marks belong to their own day; after midnight nothing is marked yet.
  const windows = buildWindows(signals.prayerTimes)
  const maghrib =
    signals.prayerTimes.find((day) => civilDateKey(civilDateIn(day.maghrib, timeZone)) === dayKey)
      ?.maghrib ?? null
  const shifted: Signals = sameDay
    ? { ...signals, now: at }
    : {
        ...signals,
        now: at,
        today: dayContextFor(at, timeZone, 0, input.hijriOffset, maghrib),
        upcoming: signals.upcoming.map((_, index) =>
          dayContextFor(at, timeZone, index + 1, input.hijriOffset, null),
        ),
        prayedToday: {},
        completedToday: {},
      }
  const planned = plan(shifted).today

  const [head, ...rest] = planned.now
  const prayed = shifted.prayedToday
  const passed = (prayer: Prayer): boolean =>
    windows.some(
      (entry) =>
        entry.name === prayer &&
        entry.endsAt <= at &&
        civilDateKey(civilDateIn(entry.startsAt, timeZone)) === dayKey,
    )

  const qadaTotal = Object.values(input.qada).reduce((sum, count) => sum + (count ?? 0), 0)
  const makeUpParts = [
    qadaTotal > 0 ? strings.qada.summary(qadaTotal) : null,
    input.fastsOwed > 0 ? strings.fasting.summary(input.fastsOwed) : null,
  ].filter((part): part is string => part !== null)

  const hijri = planned.hijri
  const current = windowAt(at, windows)
  const headlineLink = head ? link(head.itemId) : null
  const headline = head && headlineLink ? { ...headlineLink, id: head.itemId } : null
  const alsoNow = rest.flatMap((entry) => link(entry.itemId) ?? [])

  return {
    at: at.getTime(),
    stale: false,
    rtl: input.rtl,
    ink: { light: inkFor('light'), dark: inkFor('dark') },
    labels: {
      app: 'Ihsaanly',
      rightNow: strings.plan.rightNow,
      upNext: strings.plan.upNext,
      prayers: strings.plan.prayers,
      hijri: strings.hijri.title,
      alsoToday: strings.plan.alsoToday,
      quickDuas: strings.widgets.quickDuas,
      duaOfTheDay: strings.widgets.duaOfTheDay,
      makeUp: strings.plan.makeUp,
      comingUp: strings.plan.comingUp,
      nothingNow: strings.widgets.nothingNow,
      nothingOwed: strings.qada.none,
      openApp: strings.widgets.openApp,
      before: strings.plan.before,
      after: strings.plan.after,
      markDone: strings.widgets.markDone,
      markedDone: strings.widgets.markedDone,
    },
    window: planned.window ? windowName(strings, planned.window, planned.jumuah) : null,
    remaining: current
      ? remainingLabel((current.endsAt.getTime() - at.getTime()) / 60_000, strings)
      : null,
    openedAt: current?.startsAt.getTime() ?? null,
    date: {
      gregorian: new Intl.DateTimeFormat(input.locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone,
      }).format(at),
      hijri: strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year),
      hijriDay: hijri.day,
      place: input.placeLabel,
    },
    rightNow: headline,
    alsoNow,
    moreNow: headline && alsoNow.length > 0 ? strings.widgets.moreNow(alsoNow.length) : null,
    taps: [],
    next: planned.next
      ? {
          prayer: prayerName(strings, planned.next.prayer, planned.next.jumuah),
          distance: distanceLabel(
            (planned.next.startsAt.getTime() - at.getTime()) / 60_000,
            strings,
          ),
          before: planned.next.before.flatMap((id) => link(id) ?? []),
          after: planned.next.after.flatMap((id) => link(id) ?? []),
        }
      : null,
    prayers: signals.userState.trackingPaused
      ? []
      : PRAYERS.map((prayer) => ({
          // Each entry names its own day, so Friday's strip reads Jumu'ah and
          // Saturday's, later in the same timeline, reads Dhuhr again.
          name: prayerName(strings, prayer, planned.jumuah),
          short: prayerName(strings, prayer, planned.jumuah).slice(0, 1),
          done: prayed[prayer] !== undefined,
          passed: passed(prayer),
        })),
    allDay: planned.comingUp
      .filter((entry) => entry.reason === 'today')
      .flatMap((entry) => link(entry.itemId) ?? []),
    comingUp: planned.comingUp
      .filter((entry) => entry.reason === 'upcoming')
      .filter(
        (entry, index, all) => all.findIndex((other) => other.itemId === entry.itemId) === index,
      )
      .flatMap((entry) => link(entry.itemId, whenLabel(entry, strings)) ?? []),
    quickDuas: items
      .filter((item) => item.trigger.kind === 'event' && UNDETECTABLE.includes(item.trigger.event))
      .flatMap((item) => link(item.id) ?? []),
    duaOfTheDay: duaOfTheDay(dayKey),
    makeUp: {
      prayers: qadaTotal,
      fasts: input.fastsOwed,
      summary: makeUpParts.length > 0 ? makeUpParts.join(' · ') : null,
      url: 'ihsaanly://qada',
    },
  }
}

/**
 * The instants at which a rough distance to `target`, counted from within
 * `from`..`target`, turns to its next phrase.
 */
function turnsBefore(target: Date, from: Date | null): number[] {
  return ROUGH_TURNS.map((minutes) => target.getTime() - minutes * 60_000).filter(
    (at) => from === null || at > from.getTime(),
  )
}

/**
 * Entries every half hour for a day, plus one at each window's start so the
 * headline turns exactly when the window does, plus one wherever a rough
 * distance turns ("about 2 more hours" to "about an hour", "In about an hour"
 * to "Soon"), so no entry carries a phrase that has gone stale. The last entry
 * is stale: a widget left a day without the app opening asks to be opened
 * rather than guessing.
 */
export function widgetTimeline(input: WidgetInput): WidgetModel[] {
  const start = input.signals.now.getTime()
  const end = start + HORIZON_MS
  const windows = buildWindows(input.signals.prayerTimes)
  const prayerWindows = windows.filter((window) => window.name !== 'sunrise')
  const boundaries = windows.map((window) => window.startsAt.getTime())
  // How long the moment stays open counts to its window's end…
  const closing = windows.flatMap((window) => turnsBefore(window.endsAt, window.startsAt))
  // …and Up next counts to the next prayer, from the prayer before it.
  const nearing = prayerWindows.flatMap((window, index) =>
    turnsBefore(window.startsAt, prayerWindows[index - 1]?.startsAt ?? null),
  )
  const steps = Array.from({ length: HORIZON_MS / STEP_MS }, (_, index) => start + index * STEP_MS)
  const moments = [
    ...new Set([
      ...steps,
      ...[...boundaries, ...closing, ...nearing].filter((at) => at > start && at < end),
    ]),
  ].sort((a, b) => a - b)

  const entries = moments.map((at) => modelAt(input, new Date(at)))
  const last = entries.at(-1)
  return last ? [...entries, { ...last, at: end, stale: true }] : entries
}
