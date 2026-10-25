import { describe, expect, it } from 'bun:test'

import { items } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import type { Signals } from '@ihsaanly/core/plan/signals'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '@ihsaanly/core/prayer/calculation'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows } from '@ihsaanly/core/prayer/windows'
import { en } from '@ihsaanly/core/strings/en'

import { distanceLabel, remainingLabel, type WidgetInput, widgetTimeline } from './model'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

const now = new Date('2026-09-23T08:30:00Z')

function input(overrides: Partial<Signals> = {}, at: Date = now): WidgetInput {
  const signals: Signals = {
    now: at,
    timeZone: london.timeZone,
    items,
    prayerTimes: prayerTimesAcross(london, at, DEFAULT_CALCULATION_PREFERENCES, 3),
    today: dayContextFor(at, london.timeZone, 0, 0, null),
    upcoming: Array.from({ length: 7 }, (_, index) =>
      dayContextFor(at, london.timeZone, index + 1, 0, null),
    ),
    prayedToday: { fajr: new Date('2026-09-23T05:00:00Z') },
    completedToday: {},
    activeEvents: [],
    userState: DEFAULT_USER_STATE,
    attendsJumuah: true,
    preferences: {
      enabledItemIds: items.filter((item) => item.defaultOn).map((item) => item.id),
      knownItemIds: [],
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
    ...overrides,
  }
  return {
    signals,
    strings: en,
    locale: 'en-GB',
    rtl: false,
    placeLabel: 'London',
    hijriOffset: 0,
    qada: { dhuhr: 2 },
    fastsOwed: 1,
  }
}

describe('the widget timeline', () => {
  const timeline = widgetTimeline(input())
  const first = timeline[0]

  it('starts now, runs a day in order, and ends asking for the app', () => {
    expect(first?.at).toBe(now.getTime())
    const times = timeline.map((entry) => entry.at)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    expect(timeline.at(-1)?.stale).toBe(true)
    expect(timeline.filter((entry) => entry.stale)).toHaveLength(1)
  })

  it('says what the moment asks, in words, with a link into the app', () => {
    expect(first?.window).toBe('Morning')
    expect(first?.rightNow?.url).toStartWith('ihsaanly://item/')
    expect(first?.next?.prayer).toBe('Dhuhr')
    expect(first?.next?.distance).not.toMatch(/\d{1,2}:\d{2}/)
  })

  it('keeps today’s marks today and clears them after midnight', () => {
    expect(first?.prayers.find((entry) => entry.name === 'Fajr')?.done).toBe(true)
    const tomorrow = timeline.find(
      (entry) => !entry.stale && entry.date.gregorian !== first?.date.gregorian,
    )
    expect(tomorrow?.prayers.every((entry) => !entry.done)).toBe(true)
  })

  it('sums what is owed across prayers and fasts', () => {
    expect(first?.makeUp).toMatchObject({ prayers: 2, fasts: 1 })
    expect(first?.makeUp.summary).toContain('2')
  })

  it('hides the prayers while tracking is paused', () => {
    const paused = widgetTimeline(
      input({ userState: { ...DEFAULT_USER_STATE, trackingPaused: true } }),
    )
    expect(paused[0]?.prayers).toEqual([])
  })

  it('gives every entry a dua of the day with its Arabic', () => {
    expect(first?.duaOfTheDay?.arabic.length).toBeGreaterThan(0)
  })
})

describe('the widget colours', () => {
  it('are terracotta when no accent is given', () => {
    const [entry] = widgetTimeline(input())
    expect(entry?.ink.light).toMatchObject({ accent: '#a94a32', onAccent: '#fff6f0' })
    expect(entry?.ink.dark).toMatchObject({ accent: '#e28c6f', onAccent: '#1d120d' })
  })

  it('take the chosen accent in both schemes, on every entry, over the same wash', () => {
    const plain = widgetTimeline(input())
    const timeline = widgetTimeline({ ...input(), accent: 'teal' })
    for (const entry of timeline) {
      expect(entry.ink.light).toMatchObject({ accent: '#1f6b6b', onAccent: '#f0fbfa' })
      expect(entry.ink.dark).toMatchObject({ accent: '#6fc2bd', onAccent: '#0c1918' })
    }
    expect(timeline[0]?.ink.light.background).toBe(plain[0]?.ink.light.background ?? '')
    expect(timeline[0]?.ink.dark.label).toBe(plain[0]?.ink.dark.label ?? '')
  })
})

describe('the widget timeline across a Friday', () => {
  // Thursday 21:00 in London, so the day ahead runs through Friday midday.
  const thursdayEvening = new Date('2026-09-24T20:00:00Z')
  const friday = (entry: { at: number }): boolean =>
    new Date(entry.at).toLocaleDateString('en-GB', {
      timeZone: london.timeZone,
      weekday: 'long',
    }) === 'Friday'

  it("names Jumu'ah only for the entries that fall on Friday", () => {
    const timeline = widgetTimeline(input({ prayedToday: {} }, thursdayEvening)).filter(
      (entry) => !entry.stale,
    )
    const thursday = timeline.filter((entry) => !friday(entry))
    const fridays = timeline.filter(friday)

    expect(thursday.length).toBeGreaterThan(0)
    expect(fridays.length).toBeGreaterThan(0)
    thursday.forEach((entry) => {
      expect(entry.prayers.map((prayer) => prayer.name)).toContain('Dhuhr')
      expect(entry.window).not.toBe("After Jumu'ah")
    })
    fridays.forEach((entry) => {
      expect(entry.prayers.map((prayer) => prayer.name)).toContain("Jumu'ah")
      expect(entry.prayers.map((prayer) => prayer.name)).not.toContain('Dhuhr')
    })
    expect(fridays.some((entry) => entry.window === "After Jumu'ah")).toBe(true)
    // Friday morning's Up next is Jumu'ah, with its own sunnah after it.
    const morning = fridays.find((entry) => entry.window === 'Morning')
    expect(morning?.next?.prayer).toBe("Jumu'ah")
    expect(morning?.next?.after.map((link) => link.url)).toContain(
      'ihsaanly://item/sunnah-after-jumuah',
    )
    expect(morning?.next?.before.map((link) => link.url)).not.toContain(
      'ihsaanly://item/sunnah-before-dhuhr',
    )
  })

  it('names Dhuhr again on Saturday', () => {
    const fridayEvening = new Date('2026-09-25T20:00:00Z')
    const saturday = widgetTimeline(input({ prayedToday: {} }, fridayEvening)).filter(
      (entry) => !entry.stale && !friday(entry),
    )
    expect(saturday.length).toBeGreaterThan(0)
    saturday.forEach((entry) => {
      expect(entry.prayers.map((prayer) => prayer.name)).toContain('Dhuhr')
    })
    expect(saturday.some((entry) => entry.window === 'After Dhuhr')).toBe(true)
  })

  it("names Dhuhr on Friday for someone who does not pray Jumu'ah", () => {
    const timeline = widgetTimeline(
      input({ prayedToday: {}, attendsJumuah: false }, thursdayEvening),
    ).filter(friday)
    timeline.forEach((entry) => {
      expect(entry.prayers.map((prayer) => prayer.name)).toContain('Dhuhr')
    })
    expect(timeline.some((entry) => entry.window === 'After Dhuhr')).toBe(true)
  })
})

describe('how long the moment stays open', () => {
  const timeline = widgetTimeline(input())
  const live = timeline.filter((entry) => !entry.stale)
  const windows = buildWindows(input().signals.prayerTimes)

  it('says it in rough words on every entry, never a clock time', () => {
    expect(live[0]?.remaining).toBe('Open for about 3 more hours')
    live.forEach((entry) => {
      expect(entry.remaining).toBeString()
      expect(entry.remaining).not.toMatch(/\d{1,2}:\d{2}/)
    })
    expect(live.some((entry) => entry.remaining === 'Open for about another hour')).toBe(true)
    expect(live.some((entry) => entry.remaining === 'Closing soon')).toBe(true)
  })

  it('names when the moment opened, so a widget can tell this occasion from the last', () => {
    const morning = windows.find((window) => window.startsAt <= now && now < window.endsAt)
    expect(live[0]?.openedAt).toBe(morning?.startsAt.getTime() ?? -1)
  })

  it('never goes stale within an entry, nor does the distance to the next prayer', () => {
    live.forEach((entry, index) => {
      const following = timeline[index + 1]
      if (!following) return
      // The last instant this entry is on screen must still say what it says.
      const last = new Date(following.at - 1)
      const window = windows.find(
        (candidate) => candidate.startsAt <= last && last < candidate.endsAt,
      )
      const left = window ? (window.endsAt.getTime() - last.getTime()) / 60_000 : -1
      expect(remainingLabel(left, en), last.toISOString()).toBe(entry.remaining ?? '')
      const next = windows.find(
        (candidate) => candidate.startsAt > last && candidate.name !== 'sunrise',
      )
      if (!next || !entry.next) return
      const until = (next.startsAt.getTime() - last.getTime()) / 60_000
      expect(distanceLabel(until, en), last.toISOString()).toBe(entry.next.distance)
    })
  })

  it('turns each phrase at its boundary, not before', () => {
    expect(remainingLabel(46, en)).toBe('Open for about another hour')
    expect(remainingLabel(45, en)).toBe('Closing soon')
    expect(remainingLabel(91, en)).toBe('Open for about 2 more hours')
    expect(remainingLabel(90, en)).toBe('Open for about another hour')
    expect(remainingLabel(150, en)).toBe('Open for about 2 more hours')
    expect(remainingLabel(151, en)).toBe('Open for about 3 more hours')
    expect(distanceLabel(45, en)).toBe('Soon')
    expect(distanceLabel(60, en)).toBe('In about an hour')
    expect(distanceLabel(200, en)).toBe('In about 3 hours')
  })
})

describe('what else is open, and the done button', () => {
  it('counts the others beside the headline and names the headline by id', () => {
    // Dhuhr marked a few minutes ago: the after-prayer items join the window's.
    const at = new Date('2026-09-23T12:20:00Z')
    const [first] = widgetTimeline(
      input({ prayedToday: { fajr: now, dhuhr: new Date('2026-09-23T12:10:00Z') } }, at),
    )
    expect(first?.rightNow?.id).toBeString()
    expect(first?.rightNow?.url).toBe(`ihsaanly://item/${first?.rightNow?.id}`)
    expect(first?.alsoNow.length).toBeGreaterThan(0)
    expect(first?.moreNow).toBe(`+${first?.alsoNow.length} more now`)
  })

  it('says nothing more when the headline is all there is', () => {
    const [first] = widgetTimeline(input())
    expect(first?.alsoNow).toEqual([])
    expect(first?.moreNow).toBeNull()
  })

  it('offers the undetectable moments’ duas until the user chooses their own', () => {
    const [base] = widgetTimeline(input())
    expect(base?.quickDuas.length).toBeGreaterThan(0)
    expect(base?.quickDuas.every((entry) => entry.url.startsWith('ihsaanly://item/'))).toBe(true)
    const empty = widgetTimeline({ ...input(), myDuas: { pinned: [], own: [] } })[0]
    expect(empty?.quickDuas).toEqual(base?.quickDuas ?? [])
  })

  it('lists pinned items, then own duas, when the user has chosen some', () => {
    const chosen = widgetTimeline({
      ...input(),
      myDuas: {
        pinned: ['evening-adhkar', 'no-such-item'],
        own: [{ id: 'mine-parents', title: 'For my parents' }],
      },
    })
    const entry = chosen[0]
    expect(entry?.quickDuas.map((link) => link.url)).toEqual([
      'ihsaanly://item/evening-adhkar',
      'ihsaanly://item/mine-parents',
    ])
    expect(entry?.quickDuas[1]).toEqual({
      title: 'For my parents',
      detail: null,
      url: 'ihsaanly://item/mine-parents',
    })
    expect(chosen.at(-1)?.quickDuas).toEqual(entry?.quickDuas ?? [])
  })

  it('starts every entry with no taps and labels the button', () => {
    const timeline = widgetTimeline(input())
    expect(timeline.every((entry) => entry.taps.length === 0)).toBe(true)
    expect(timeline[0]?.labels.markDone).toBe('Mark done')
    expect(timeline[0]?.labels.markedDone).toBe('Marked done')
  })
})
