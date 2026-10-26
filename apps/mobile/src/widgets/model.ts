import { itemById, items, resolveText } from '@ihsaanly/core/content'
import { itemOpenPath } from '@ihsaanly/core/content/reader'
import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { prayerName, windowName } from '@ihsaanly/core/plan/jumuah'
import { beforePrayerOpensAt, plan } from '@ihsaanly/core/plan/plan'
import type { PlannedItem, Signals } from '@ihsaanly/core/plan/signals'
import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import { buildWindows, type PrayerWindow, windowAt } from '@ihsaanly/core/prayer/windows'
import type { Strings } from '@ihsaanly/core/strings/en'
import { type AccentName, paletteFor } from '@ihsaanly/tailwind/tokens'

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

/**
 * An item a widget can act on: a link, plus the id a tap is filed under.
 * Without `since` the widget only opens it.
 */
export interface WidgetItem extends WidgetLink {
  id: string
  /**
   * Epoch ms at which this occasion of the item opened. A tap counts for the
   * item only from then, so a tap for an earlier occasion (the tasbih after
   * Dhuhr, seen again after Asr) does not read as done.
   */
  since?: number
  /** Done this occasion, as the app knew when it published. */
  done?: boolean
  /** A counted item (the tasbih): how many it takes, and how many the app had counted. */
  repeat?: number
  count?: number
}

/**
 * What a widget tap asks: `done` marks an item done, `prayer` marks a prayer
 * (`id` is the prayer), `count` counts one of a counted item. A tap written
 * before kinds existed has none and is a `done`.
 */
export type WidgetTapKind = 'done' | 'prayer' | 'count'

/**
 * A tap on a widget, kept where the widget can write (the App Group's
 * timeline on iOS, a file on Android) until the app takes it into its log.
 * `at` is the tap's epoch ms, from which the app files it under the right
 * day and window, as any mark is.
 */
export interface WidgetTap {
  kind?: WidgetTapKind
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
    saidIt: string
    marked: string
    addOne: string
    /** `{count}` and `{total}` are filled in on the widget, which counts its own taps. */
    countOf: string
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
  /** Taps the app has not taken in yet. Empty from the app, bar those it carries; the widget appends. */
  taps: WidgetTap[]
  /** Only a named prayer's "before" items can be marked ahead; "after" ones are not owed yet. */
  next: { prayer: string; distance: string; before: WidgetItem[]; after: WidgetLink[] } | null
  /**
   * Empty when tracking is paused. `id` is the prayer a tap marks; `since`,
   * once that day's window has opened and while it is unmarked, is when.
   */
  prayers: {
    id: string
    name: string
    short: string
    done: boolean
    passed: boolean
    since?: number
  }[]
  allDay: WidgetLink[]
  comingUp: WidgetLink[]
  quickDuas: WidgetItem[]
  /** `since` is the start of the civil day: today's dua is said once. */
  duaOfTheDay: {
    id: string
    title: string
    arabic: string
    translation: string | null
    url: string
    since: number
    done: boolean
  } | null
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
  /** The chosen accent; widgets cannot read the app's preferences, so it is resolved here. */
  accent?: AccentName
  /**
   * What the user chose for the Quick duas widget: pinned library items, then
   * their own duas. Absent or empty, the widget offers the duas for the
   * moments a phone cannot detect.
   */
  myDuas?: { pinned: string[]; own: { id: string; title: string }[] }
  /** Counted items' progress now (the tasbih's taps so far), by item id. */
  counts?: Partial<Record<string, number>>
}

const STEP_MS = 30 * 60_000
const HORIZON_MS = 24 * 60 * 60_000

/** The events a phone cannot detect, which is what the quick widget is for. */
const UNDETECTABLE = ['ascending', 'descending', 'leaving-home', 'travel']

/** A dua or dhikr opens in the focused reader, anything else on its own screen. */
function itemUrl(id: string): string {
  return `ihsaanly:/${itemOpenPath(id)}`
}

function link(id: string, detail: string | null = null): WidgetLink | null {
  const item = itemById(id)
  if (!item) return null
  return { title: resolveText(item.title) ?? id, detail, url: itemUrl(id) }
}

/**
 * What the user chose for the Quick duas widget, pinned items then their own
 * duas, each markable like the defaults; with nothing chosen, the duas for the
 * moments a phone cannot detect.
 */
function quickDuas(
  chosen: WidgetInput['myDuas'],
  actionable: (id: string) => WidgetItem | null,
): WidgetItem[] {
  const mine = [
    ...(chosen?.pinned ?? []).flatMap((id) => actionable(id) ?? []),
    ...(chosen?.own ?? []).map(
      (dua) =>
        actionable(dua.id) ?? { id: dua.id, title: dua.title, detail: null, url: itemUrl(dua.id) },
    ),
  ]
  if (mine.length > 0) return mine
  return items
    .filter((item) => item.trigger.kind === 'event' && UNDETECTABLE.includes(item.trigger.event))
    .flatMap((item) => actionable(item.id) ?? [])
}

function inkFor(scheme: 'light' | 'dark', accent: AccentName | undefined): WidgetInk {
  const palette = paletteFor(scheme, accent)
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

/** Epoch ms of the civil midnight `at` falls after, in `timeZone`. */
const clocks = new Map<string, Intl.DateTimeFormat>()

function startOfDay(at: Date, timeZone: string): number {
  // A formatter is costly to make and a timeline asks for one per entry.
  const clock =
    clocks.get(timeZone) ??
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
  clocks.set(timeZone, clock)
  const parts = clock.formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0)
  const elapsed = (part('hour') * 60 + part('minute')) * 60 + part('second')
  return at.getTime() - elapsed * 1000 - at.getUTCMilliseconds()
}

/** The previous prayer window's start, from which a named prayer's "before" may be marked. */
function upNextSince(
  itemId: string,
  window: PrayerWindow | null,
  windows: PrayerWindow[],
): number | undefined {
  const trigger = itemById(itemId)?.trigger
  if (!window || trigger?.kind !== 'prayer' || trigger.prayer === 'any') return undefined
  return beforePrayerOpensAt(trigger, window, windows).getTime()
}

/** One per civil day, so the widget and a friend's phone agree on today's dua. */
function duaOfTheDay(
  dayKey: string,
  since: number,
  doneSince: (id: string, since: number) => boolean,
): WidgetModel['duaOfTheDay'] {
  const candidates = items.filter((item) => item.arabic !== null)
  if (candidates.length === 0) return null
  const dayNumber = Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000)
  const item = candidates[dayNumber % candidates.length]
  if (!item?.arabic) return null
  return {
    id: item.id,
    title: resolveText(item.title) ?? item.id,
    arabic: item.arabic,
    translation: resolveText(item.translation),
    url: itemUrl(item.id),
    since,
    done: doneSince(item.id, since),
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
  const dayStart = startOfDay(at, timeZone)
  const opened = current?.startsAt.getTime() ?? dayStart
  // Progress counted in the app belongs to the moment it was published in;
  // a later window (or day) starts the count again.
  const nowWindow = windowAt(signals.now, windows)
  const sameOccasion =
    sameDay && (current?.startsAt.getTime() ?? null) === (nowWindow?.startsAt.getTime() ?? null)
  const doneSince = (id: string, since: number): boolean =>
    (shifted.completedToday[id]?.getTime() ?? Number.NEGATIVE_INFINITY) >= since
  const actionable = (id: string, since: number): WidgetItem | null => {
    const base = link(id)
    const content = itemById(id)
    if (!base || !content) return null
    const counted = content.repeat > 1 && (content.parts ?? []).length === 0
    const count = sameOccasion ? (input.counts?.[id] ?? 0) : 0
    return {
      ...base,
      id,
      since,
      done: doneSince(id, since),
      ...(counted ? { repeat: content.repeat, count: Math.min(content.repeat, count) } : {}),
    }
  }

  const headline = head
    ? actionable(
        head.itemId,
        head.reason === 'before-prayer'
          ? (upNextSince(head.itemId, current, windows) ?? opened)
          : opened,
      )
    : null
  const alsoNow = rest.flatMap((entry) => link(entry.itemId) ?? [])
  const nextWindow = planned.next
    ? (windows.find((entry) => entry.startsAt.getTime() === planned.next?.startsAt.getTime()) ??
      null)
    : null

  return {
    at: at.getTime(),
    stale: false,
    rtl: input.rtl,
    ink: { light: inkFor('light', input.accent), dark: inkFor('dark', input.accent) },
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
      saidIt: strings.widgets.saidIt,
      marked: strings.widgets.marked,
      addOne: strings.widgets.addOne,
      countOf: strings.widgets.countOf,
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
          before: planned.next.before.flatMap((id) => {
            const since = upNextSince(id, nextWindow, windows)
            if (since !== undefined) return actionable(id, since) ?? []
            const base = link(id)
            return base ? [{ ...base, id }] : []
          }),
          after: planned.next.after.flatMap((id) => link(id) ?? []),
        }
      : null,
    prayers: signals.userState.trackingPaused
      ? []
      : PRAYERS.map((prayer) => {
          const done = prayed[prayer] !== undefined
          // A prayer can be marked from the widget once its window has opened
          // on this entry's day, as on Today's strip.
          const opens = windows
            .filter(
              (entry) =>
                entry.name === prayer &&
                entry.startsAt <= at &&
                entry.startsAt.getTime() >= dayStart,
            )
            .at(-1)
          return {
            id: prayer,
            // Each entry names its own day, so Friday's strip reads Jumu'ah and
            // Saturday's, later in the same timeline, reads Dhuhr again.
            name: prayerName(strings, prayer, planned.jumuah),
            short: prayerName(strings, prayer, planned.jumuah).slice(0, 1),
            done,
            passed: passed(prayer),
            ...(opens && !done ? { since: opens.startsAt.getTime() } : {}),
          }
        }),
    allDay: planned.comingUp
      .filter((entry) => entry.reason === 'today')
      .flatMap((entry) => link(entry.itemId) ?? []),
    comingUp: planned.comingUp
      .filter((entry) => entry.reason === 'upcoming')
      .filter(
        (entry, index, all) => all.findIndex((other) => other.itemId === entry.itemId) === index,
      )
      .flatMap((entry) => link(entry.itemId, whenLabel(entry, strings)) ?? []),
    quickDuas: quickDuas(input.myDuas, (id) => actionable(id, opened)),
    duaOfTheDay: duaOfTheDay(dayKey, dayStart, doneSince),
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
