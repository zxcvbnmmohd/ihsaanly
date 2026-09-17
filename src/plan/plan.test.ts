import { describe, expect, it } from 'bun:test'

import type { Item, Trigger } from '@/content/schema'
import { civilDateIn } from '@/day/boundaries'
import type { Place } from '@/location/place'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows, type WindowName } from '@/prayer/windows'

import { plan } from './plan'
import type { DayContext, Signals } from './signals'

const toronto: Place = {
  label: 'Toronto, Ontario, Canada',
  latitude: 43.7,
  longitude: -79.42,
  timeZone: 'America/Toronto',
  source: 'city',
}

const anchor = new Date('2026-09-17T12:00:00Z')
const times = prayerTimesAcross(toronto, anchor, DEFAULT_CALCULATION_PREFERENCES)

function startOf(name: WindowName): Date {
  const window = buildWindows(times).find(
    (candidate) => candidate.name === name && candidate.startsAt > anchor,
  )
  if (!window) throw new Error(`no upcoming ${name} window in the fixture range`)
  return new Date(window.startsAt.getTime() + 60_000)
}

function makeItem(id: string, trigger: Trigger, overrides: Partial<Item> = {}): Item {
  return {
    id,
    category: 'test',
    title: { en: id },
    ruling: 'sunnah',
    arabic: null,
    transliteration: null,
    translation: null,
    repeat: 1,
    evidence: [
      {
        type: 'hadith',
        collection: 'Sahih Muslim',
        reference: '1',
        grading: 'sahih',
        gradedBy: null,
        text: { en: 'narration' },
      },
    ],
    trigger,
    defaultOn: true,
    note: null,
    audio: null,
    audioTranslation: null,
    ...overrides,
  }
}

function dayContext(offset: number, hijri: { month: number; day: number }): DayContext {
  const at = new Date(anchor.getTime() + offset * 86_400_000)
  return {
    civil: civilDateIn(at, toronto.timeZone),
    hijri: { year: 1448, month: hijri.month, day: hijri.day },
    weekday: at.getDay(),
  }
}

function makeSignals(items: Item[], overrides: Partial<Signals> = {}): Signals {
  return {
    now: startOf('asr'),
    timeZone: toronto.timeZone,
    items,
    prayerTimes: times,
    today: dayContext(0, { month: 4, day: 6 }),
    upcoming: [],
    prayedToday: {},
    activeEvents: [],
    userState: { travelling: false, trackingPaused: false },
    preferences: {
      enabledItemIds: items.map((item) => item.id),
      knownItemIds: [],
      maxNotificationsPerDay: 3,
    },
    ...overrides,
  }
}

const eveningAdhkar = makeItem('evening-adhkar', { kind: 'window', window: 'evening' })
const morningAdhkar = makeItem('morning-adhkar', { kind: 'window', window: 'morning' })
const leavingHome = makeItem('leaving-home', { kind: 'event', event: 'leaving-home' })
const rawatib = makeItem('after-dhuhr', { kind: 'prayer', prayer: 'dhuhr', when: 'after' })
const dhikr = makeItem('after-any', { kind: 'prayer', prayer: 'any', when: 'after' })
const whiteDays = makeItem('white-days', { kind: 'day', day: 'white-days' })

describe('what is relevant right now', () => {
  it('surfaces the item whose window is current', () => {
    const result = plan(makeSignals([morningAdhkar, eveningAdhkar]))
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
    expect(result.today.rightNow?.reason).toBe('current-window')
  })

  it('shows at most one right-now card', () => {
    const second = makeItem('evening-two', { kind: 'window', window: 'evening' })
    const result = plan(makeSignals([eveningAdhkar, second]))
    expect(result.today.rightNow).not.toBeNull()
  })

  it('lets an active event outrank the current window', () => {
    const result = plan(
      makeSignals([eveningAdhkar, leavingHome], { activeEvents: ['leaving-home'] }),
    )
    expect(result.today.rightNow?.itemId).toBe('leaving-home')
    expect(result.today.rightNow?.reason).toBe('active-event')
  })

  it('does not repeat the right-now item in the context strip', () => {
    const result = plan(makeSignals([leavingHome], { activeEvents: ['leaving-home'] }))
    expect(result.today.context).toEqual([])
  })

  it('surfaces nothing when nothing matches', () => {
    const result = plan(makeSignals([morningAdhkar]))
    expect(result.today.rightNow).toBeNull()
    expect(result.today.comingUp).toEqual([])
  })

  it('reports the window the user is in', () => {
    expect(plan(makeSignals([])).today.window).toBe('asr')
  })
})

describe('prayer-bound items', () => {
  it('appear once their prayer is marked', () => {
    const before = plan(makeSignals([rawatib]))
    expect(before.today.rightNow).toBeNull()

    const after = plan(makeSignals([rawatib], { prayedToday: { dhuhr: anchor } }))
    expect(after.today.rightNow?.reason).toBe('after-prayer')
  })

  it('treat "any" as satisfied by any marked prayer', () => {
    const result = plan(makeSignals([dhikr], { prayedToday: { asr: anchor } }))
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })
})

describe('items that come before a prayer', () => {
  const beforeFajr = makeItem('before-fajr', { kind: 'prayer', prayer: 'fajr', when: 'before' })
  const beforeAny = makeItem('siwak', { kind: 'prayer', prayer: 'any', when: 'before' })

  it('appear in the window that leads into that prayer', () => {
    const result = plan(makeSignals([beforeFajr], { now: startOf('isha') }))
    expect(result.today.rightNow?.reason).toBe('before-prayer')
  })

  it('stay hidden at every other hour', () => {
    const result = plan(makeSignals([beforeFajr], { now: startOf('dhuhr') }))
    expect(result.today.rightNow).toBeNull()
  })

  it('disappear once that prayer is marked', () => {
    const result = plan(
      makeSignals([beforeFajr], { now: startOf('isha'), prayedToday: { fajr: anchor } }),
    )
    expect(result.today.rightNow).toBeNull()
  })

  it('treat "any" as the prayer of the current window', () => {
    const during = plan(makeSignals([beforeAny], { now: startOf('dhuhr') }))
    expect(during.today.rightNow?.itemId).toBe('siwak')

    const done = plan(
      makeSignals([beforeAny], { now: startOf('dhuhr'), prayedToday: { dhuhr: anchor } }),
    )
    expect(done.today.rightNow).toBeNull()
  })
})

describe('user state overrides selection', () => {
  it('removes every prayer item while tracking is paused', () => {
    const result = plan(
      makeSignals([rawatib, dhikr, eveningAdhkar], {
        prayedToday: { dhuhr: anchor },
        userState: { travelling: false, trackingPaused: true },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
  })

  it('suppresses the rawatib while travelling but keeps the dhikr after prayer', () => {
    const result = plan(
      makeSignals([rawatib, dhikr], {
        prayedToday: { dhuhr: anchor },
        userState: { travelling: true, trackingPaused: false },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })
})

describe('travelling', () => {
  const fast = makeItem('fast-monday', { kind: 'day', day: 'monday' }, { category: 'fasting' })
  const travelDua = makeItem('dua-travel', { kind: 'event', event: 'travel' })

  const onJourney = (extra: Partial<Signals> = {}): Signals =>
    makeSignals([fast, travelDua, rawatib], {
      today: { ...dayContext(0, { month: 4, day: 6 }), weekday: 1 },
      prayedToday: { dhuhr: anchor },
      activeEvents: ['travel'],
      userState: { travelling: true, trackingPaused: false },
      ...extra,
    })

  it('offers fasting as optional rather than expected', () => {
    const fasting = plan(onJourney()).today.comingUp.find((entry) => entry.itemId === 'fast-monday')
    expect(fasting?.optional).toBe(true)
  })

  it('does not mark fasting optional when not travelling', () => {
    const settled = plan(
      makeSignals([fast], { today: { ...dayContext(0, { month: 4, day: 6 }), weekday: 1 } }),
    )
    expect(settled.today.comingUp[0]?.optional).toBe(false)
  })

  it('raises the travel items', () => {
    expect(plan(onJourney()).today.rightNow?.itemId).toBe('dua-travel')
  })

  it('still suppresses the rawatib', () => {
    const ids = plan(onJourney()).today.context.map((entry) => entry.itemId)
    expect(ids).not.toContain('after-dhuhr')
  })
})

describe('the calendar', () => {
  const cases: [string, Trigger, { month: number; day: number }, number][] = [
    ['white days', { kind: 'day', day: 'white-days' }, { month: 4, day: 14 }, 0],
    ['Ashura', { kind: 'day', day: 'ashura' }, { month: 1, day: 10 }, 0],
    ['Arafah', { kind: 'day', day: 'arafah' }, { month: 12, day: 9 }, 0],
    ['Ramadan', { kind: 'day', day: 'ramadan' }, { month: 9, day: 3 }, 0],
    ['six of Shawwal', { kind: 'day', day: 'shawwal-6' }, { month: 10, day: 5 }, 0],
    ['the ten of Dhul Hijjah', { kind: 'day', day: 'dhul-hijjah' }, { month: 12, day: 3 }, 0],
  ]

  cases.forEach(([name, trigger, hijri]) => {
    it(`recognises ${name}`, () => {
      const item = makeItem('occasion', trigger)
      const result = plan(makeSignals([item], { today: dayContext(0, hijri) }))
      expect(result.today.comingUp.map((entry) => entry.itemId)).toContain('occasion')
    })
  })

  it('looks ahead, saying how many days away', () => {
    const result = plan(
      makeSignals([whiteDays], {
        today: dayContext(0, { month: 4, day: 6 }),
        upcoming: [dayContext(1, { month: 4, day: 12 }), dayContext(2, { month: 4, day: 13 })],
      }),
    )
    const upcoming = result.today.comingUp.find((entry) => entry.reason === 'upcoming')
    expect(upcoming?.itemId).toBe('white-days')
    expect(upcoming?.daysAway).toBe(2)
  })

  it('never lists a day that does not match', () => {
    const result = plan(makeSignals([whiteDays], { today: dayContext(0, { month: 4, day: 6 }) }))
    expect(result.today.comingUp).toEqual([])
  })
})

describe('the notification schedule', () => {
  it('schedules window items at the start of their window', () => {
    const result = plan(makeSignals([morningAdhkar]))
    expect(result.notifications.length).toBeGreaterThan(0)
    expect(result.notifications.every((entry) => entry.at > anchor)).toBe(true)
  })

  it('never exceeds the daily budget', () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      makeItem(`morning-${index}`, { kind: 'window', window: 'morning' }),
    )
    const result = plan(
      makeSignals(many, {
        preferences: {
          enabledItemIds: many.map((item) => item.id),
          knownItemIds: [],
          maxNotificationsPerDay: 2,
        },
      }),
    )

    const perDay = new Map<string, number>()
    result.notifications.forEach((entry) => {
      const day = civilDateIn(entry.at, toronto.timeZone)
      const key = `${day.year}-${day.month}-${day.day}`
      perDay.set(key, (perDay.get(key) ?? 0) + 1)
    })

    expect([...perDay.values()].every((count) => count <= 2)).toBe(true)
  })

  it('drops memorised items from the rotation without hiding them', () => {
    const signals = makeSignals([eveningAdhkar, morningAdhkar], {
      preferences: {
        enabledItemIds: ['evening-adhkar', 'morning-adhkar'],
        knownItemIds: ['morning-adhkar'],
        maxNotificationsPerDay: 5,
      },
    })
    const result = plan(signals)

    expect(result.notifications.some((entry) => entry.itemId === 'morning-adhkar')).toBe(false)
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
  })

  it('is empty when nothing is enabled', () => {
    const result = plan(
      makeSignals([morningAdhkar], {
        preferences: { enabledItemIds: [], knownItemIds: [], maxNotificationsPerDay: 3 },
      }),
    )
    expect(result.notifications).toEqual([])
  })
})
