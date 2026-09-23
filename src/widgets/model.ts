import { itemById, items, resolveText } from '@/content'
import { civilDateIn, civilDateKey } from '@/day/boundaries'
import { plan } from '@/plan/plan'
import { dayContextFor } from '@/plan/day-context'
import type { PlannedItem, Signals } from '@/plan/signals'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { buildWindows } from '@/prayer/windows'
import type { Strings } from '@/strings/en'
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
  }
  /** "Morning", "After Maghrib"; null before the first prayer is calculable. */
  window: string | null
  /** `hijriDay` is the bare number, for a circle too small for the formatted date. */
  date: { gregorian: string; hijri: string; hijriDay: number; place: string | null }
  rightNow: WidgetLink | null
  alsoNow: WidgetLink[]
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

/** A rough distance, never a clock time: the app says how the day feels, not when it ticks. */
export function distanceLabel(minutes: number, strings: Strings): string {
  if (minutes < 45) return strings.plan.soon
  if (minutes < 90) return strings.plan.inAboutAnHour
  return strings.plan.inAboutHours(Math.round(minutes / 60))
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
    },
    window: planned.window ? strings.window[planned.window] : null,
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
    rightNow: head ? link(head.itemId) : null,
    alsoNow: rest.flatMap((entry) => link(entry.itemId) ?? []),
    next: planned.next
      ? {
          prayer: strings.prayer[planned.next.prayer],
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
          name: strings.prayer[prayer],
          short: strings.prayer[prayer].slice(0, 1),
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
 * Entries every half hour for a day, plus one at each window's start so the
 * headline turns exactly when the window does. The last entry is stale: a
 * widget left a day without the app opening asks to be opened rather than
 * guessing.
 */
export function widgetTimeline(input: WidgetInput): WidgetModel[] {
  const start = input.signals.now.getTime()
  const end = start + HORIZON_MS
  const boundaries = buildWindows(input.signals.prayerTimes)
    .map((window) => window.startsAt.getTime())
    .filter((at) => at > start && at < end)
  const steps = Array.from({ length: HORIZON_MS / STEP_MS }, (_, index) => start + index * STEP_MS)
  const moments = [...new Set([...steps, ...boundaries])].sort((a, b) => a - b)

  const entries = moments.map((at) => modelAt(input, new Date(at)))
  const last = entries.at(-1)
  return last ? [...entries, { ...last, at: end, stale: true }] : entries
}
