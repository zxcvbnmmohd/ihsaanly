import { describe, expect, it } from 'bun:test'

import { items } from '@/content'
import type { Place } from '@/location/place'
import { dayContextFor } from '@/plan/day-context'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/plan/notification-preferences'
import type { Signals } from '@/plan/signals'
import { DEFAULT_USER_STATE } from '@/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { prayerTimesAcross } from '@/prayer/times'
import { en } from '@/strings/en'

import { widgetTimeline, type WidgetInput } from './model'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

const now = new Date('2026-09-23T08:30:00Z')

function input(overrides: Partial<Signals> = {}): WidgetInput {
  const signals: Signals = {
    now,
    timeZone: london.timeZone,
    items,
    prayerTimes: prayerTimesAcross(london, now, DEFAULT_CALCULATION_PREFERENCES, 3),
    today: dayContextFor(now, london.timeZone, 0, 0, null),
    upcoming: Array.from({ length: 7 }, (_, index) =>
      dayContextFor(now, london.timeZone, index + 1, 0, null),
    ),
    prayedToday: { fajr: new Date('2026-09-23T05:00:00Z') },
    completedToday: {},
    activeEvents: [],
    userState: DEFAULT_USER_STATE,
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
