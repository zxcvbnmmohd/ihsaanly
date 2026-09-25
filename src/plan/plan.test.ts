import { describe, expect, it } from 'bun:test'

import type { Item, Trigger } from '@/content/schema'
import { civilDateIn } from '@/day/boundaries'
import type { Place } from '@/location/place'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows, type PrayerWindow, type WindowName } from '@/prayer/windows'

import { DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences'
import { plan } from './plan'
import type { DayContext, ScheduledNotification, Signals } from './signals'

const toronto: Place = {
  label: 'Toronto, Ontario, Canada',
  latitude: 43.7,
  longitude: -79.42,
  timeZone: 'America/Toronto',
  source: 'city',
}

const anchor = new Date('2026-09-17T12:00:00Z')
const times = prayerTimesAcross(toronto, anchor, DEFAULT_CALCULATION_PREFERENCES, 8)

function windowOf(name: WindowName): PrayerWindow {
  const window = buildWindows(times).find(
    (candidate) => candidate.name === name && candidate.startsAt > anchor,
  )
  if (!window) throw new Error(`no upcoming ${name} window in the fixture range`)
  return window
}

function startOf(name: WindowName): Date {
  return new Date(windowOf(name).startsAt.getTime() + 60_000)
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
    why: null,
    reminder: null,
    how: [],
    reviewed: true,
    audio: null,
    audioTranslation: null,
    ...overrides,
  }
}

function dayContext(
  offset: number,
  hijri: { month: number; day: number },
  calculated = hijri,
): DayContext {
  const at = new Date(anchor.getTime() + offset * 86_400_000)
  return {
    civil: civilDateIn(at, toronto.timeZone),
    hijri: { year: 1448, month: hijri.month, day: hijri.day },
    hijriCalculated: { year: 1448, month: calculated.month, day: calculated.day },
    weekday: at.getDay(),
    hijriWeekday: at.getDay(),
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
    completedToday: {},
    activeEvents: [],
    userState: { travelling: false, trackingPaused: false, jumuah: 'auto' },
    attendsJumuah: true,
    preferences: {
      enabledItemIds: items.map((item) => item.id),
      knownItemIds: [],
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, quietHours: null },
    },
    ...overrides,
  }
}

/** A prayer marked a few minutes before the fixture's `now`, inside the after-prayer grace. */
const justNow = new Date(startOf('asr').getTime() - 5 * 60_000)

/** Asr marked moments after its own window opened, still ahead of the fixture's `now`. */
const justMarkedAsr = new Date(windowOf('asr').startsAt.getTime() + 10_000)

function itemIds(entries: ScheduledNotification[]): string[] {
  return entries.flatMap((entry) => (entry.kind === 'item' ? [entry.itemId] : []))
}

const eveningAdhkar = makeItem('evening-adhkar', { kind: 'window', window: 'evening' })
const morningAdhkar = makeItem('morning-adhkar', { kind: 'window', window: 'morning' })
const leavingHome = makeItem('leaving-home', { kind: 'event', event: 'leaving-home' })
// A rawatib is a prayer: the category is what sets it apart from the ghusl for
// Jumu'ah, which shares a named-prayer trigger and stays on a journey.
const rawatib = makeItem(
  'after-dhuhr',
  { kind: 'prayer', prayer: 'dhuhr', when: 'after' },
  { category: 'prayer' },
)
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

    const after = plan(makeSignals([rawatib], { prayedToday: { dhuhr: justNow } }))
    expect(after.today.rightNow?.reason).toBe('after-prayer')
  })

  it('treat "any" as satisfied by any marked prayer', () => {
    const result = plan(makeSignals([dhikr], { prayedToday: { asr: justMarkedAsr } }))
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })
})

describe('items that come before a prayer', () => {
  const beforeFajr = makeItem('before-fajr', { kind: 'prayer', prayer: 'fajr', when: 'before' })
  const beforeAny = makeItem('siwak', { kind: 'prayer', prayer: 'any', when: 'before' })

  it("appear in that prayer's own window", () => {
    const result = plan(makeSignals([beforeFajr], { now: startOf('fajr') }))
    expect(result.today.rightNow?.reason).toBe('before-prayer')
  })

  it('stay out of the window that only leads into it', () => {
    // The rawatib are prayed once the time has entered. Isha's window runs for
    // hours before Fajr, and this used to put them under Right now throughout.
    const result = plan(makeSignals([beforeFajr], { now: startOf('isha') }))
    expect(result.today.rightNow).toBeNull()
    expect(result.today.next?.before).toEqual(['before-fajr'])
  })

  it('stay hidden at every other hour', () => {
    const result = plan(makeSignals([beforeFajr], { now: startOf('dhuhr') }))
    expect(result.today.rightNow).toBeNull()
  })

  it('disappear once that prayer is marked', () => {
    const result = plan(
      makeSignals([beforeFajr], { now: startOf('fajr'), prayedToday: { fajr: anchor } }),
    )
    expect(result.today.rightNow).toBeNull()
  })

  it('treat "any" as the prayer of the current window', () => {
    const during = plan(makeSignals([beforeAny], { now: startOf('dhuhr') }))
    expect(during.today.rightNow?.itemId).toBe('siwak')

    const done = plan(
      makeSignals([beforeAny], { now: startOf('dhuhr'), prayedToday: { dhuhr: justNow } }),
    )
    expect(done.today.rightNow).toBeNull()
  })
})

describe('user state overrides selection', () => {
  it('removes every prayer item while tracking is paused', () => {
    const result = plan(
      makeSignals([rawatib, dhikr, eveningAdhkar], {
        prayedToday: { dhuhr: justNow },
        userState: { travelling: false, trackingPaused: true, jumuah: 'auto' },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
  })

  it('suppresses the rawatib while travelling but keeps the dhikr after prayer', () => {
    const result = plan(
      makeSignals([rawatib, dhikr], {
        prayedToday: { dhuhr: justNow },
        userState: { travelling: true, trackingPaused: false, jumuah: 'auto' },
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
      prayedToday: { dhuhr: justNow },
      activeEvents: ['travel'],
      userState: { travelling: true, trackingPaused: false, jumuah: 'auto' },
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

describe('a calculated calendar is never asserted', () => {
  const arafah = makeItem('fast-arafah', { kind: 'day', day: 'arafah' }, { category: 'fasting' })

  it('marks a day as expected when both readings agree', () => {
    const result = plan(makeSignals([arafah], { today: dayContext(0, { month: 12, day: 9 }) }))
    expect(result.today.comingUp[0]?.caveat).toBe('expected')
  })

  it('recognises Arafah on the local reading when the two differ', () => {
    const result = plan(
      makeSignals([arafah], { today: dayContext(0, { month: 12, day: 9 }, { month: 12, day: 8 }) }),
    )
    expect(result.today.comingUp[0]?.itemId).toBe('fast-arafah')
  })

  it('recognises Arafah on the day of standing in Makkah when the two differ', () => {
    const result = plan(
      makeSignals([arafah], { today: dayContext(0, { month: 12, day: 8 }, { month: 12, day: 9 }) }),
    )
    expect(result.today.comingUp[0]?.itemId).toBe('fast-arafah')
  })

  it('asks the user to confirm locally when the readings disagree', () => {
    const result = plan(
      makeSignals([arafah], { today: dayContext(0, { month: 12, day: 9 }, { month: 12, day: 8 }) }),
    )
    expect(result.today.comingUp[0]?.caveat).toBe('confirm-locally')
  })

  it('leaves a non-calendar item without a caveat', () => {
    const result = plan(makeSignals([eveningAdhkar]))
    expect(result.today.rightNow?.caveat).toBeUndefined()
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
          notifications: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            quietHours: null,
            maxPerDay: 2,
          },
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
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          quietHours: null,
          maxPerDay: 5,
        },
      },
    })
    const result = plan(signals)

    expect(itemIds(result.notifications)).not.toContain('morning-adhkar')
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
  })

  it('stays silent during quiet hours', () => {
    const loud = plan(makeSignals([morningAdhkar, eveningAdhkar]))
    const quiet = plan(
      makeSignals([morningAdhkar, eveningAdhkar], {
        preferences: {
          enabledItemIds: ['morning-adhkar', 'evening-adhkar'],
          knownItemIds: [],
          notifications: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            quietHours: { from: 0, to: 23 },
          },
        },
      }),
    )

    expect(loud.notifications.length).toBeGreaterThan(0)
    expect(quiet.notifications).toEqual([])
  })

  it('lets a per-item override beat its category', () => {
    const result = plan(
      makeSignals([morningAdhkar], {
        preferences: {
          enabledItemIds: ['morning-adhkar'],
          knownItemIds: [],
          notifications: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            quietHours: null,
            windows: false,
            perItem: { 'morning-adhkar': true },
          },
        },
      }),
    )

    expect(result.notifications.length).toBeGreaterThan(0)
  })

  it('is empty when nothing is enabled', () => {
    const result = plan(
      makeSignals([morningAdhkar], {
        preferences: {
          enabledItemIds: [],
          knownItemIds: [],
          notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, quietHours: null },
        },
      }),
    )
    expect(result.notifications).toEqual([])
  })
})

describe('everything open right now', () => {
  const siwak = makeItem('siwak', { kind: 'prayer', prayer: 'any', when: 'before' })

  it('lists every relevant item, best first, with the hero at its head', () => {
    const now = startOf('asr')
    const result = plan(
      makeSignals([eveningAdhkar, leavingHome, siwak], { now, activeEvents: ['leaving-home'] }),
    )
    expect(result.today.now.map((entry) => entry.itemId)).toEqual([
      'leaving-home',
      'evening-adhkar',
      'siwak',
    ])
    expect(result.today.rightNow?.itemId).toBe('leaving-home')
  })

  it('leaves all-day items out of now', () => {
    const result = plan(
      makeSignals([whiteDays, eveningAdhkar], { today: dayContext(0, { month: 4, day: 13 }) }),
    )
    expect(result.today.now.map((entry) => entry.itemId)).toEqual(['evening-adhkar'])
  })
})

describe('the hour after a prayer', () => {
  const now = startOf('asr')

  it('lets the sunnah of a just-marked prayer lead the window item', () => {
    const result = plan(
      makeSignals([eveningAdhkar, dhikr], { now, prayedToday: { asr: justMarkedAsr } }),
    )
    expect(result.today.now.map((entry) => entry.itemId)).toEqual(['after-any', 'evening-adhkar'])
  })

  it('returns the window item to the front once the hour has passed', () => {
    const asr = new Date(now.getTime() - 61 * 60_000)
    const result = plan(makeSignals([eveningAdhkar, dhikr], { now, prayedToday: { asr } }))
    expect(result.today.now.map((entry) => entry.itemId)).toEqual(['evening-adhkar'])
  })

  it('measures "any" from the most recent mark', () => {
    const result = plan(
      makeSignals([dhikr], {
        now,
        prayedToday: {
          dhuhr: new Date(now.getTime() - 3 * 3_600_000),
          asr: new Date(now.getTime() - 60_000),
        },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })
})

describe('a late mark and the after-prayer sunnah', () => {
  it('does not raise it when the mark landed long after the window and its grace had closed', () => {
    // Fajr marked hours after sunrise — well past the window and its hour of grace.
    const lateMark = new Date(windowOf('fajr').endsAt.getTime() + 3 * 3_600_000)
    const now = new Date(lateMark.getTime() + 60_000)

    const result = plan(makeSignals([dhikr], { now, prayedToday: { fajr: lateMark } }))
    expect(result.today.now.map((entry) => entry.itemId)).not.toContain('after-any')
    expect(result.today.rightNow).toBeNull()
  })

  it('still raises it when the mark landed within the grace after the window closed', () => {
    // Fajr marked thirty minutes after sunrise — inside the hour of grace.
    const gracedMark = new Date(windowOf('fajr').endsAt.getTime() + 30 * 60_000)
    const now = new Date(gracedMark.getTime() + 60_000)

    const result = plan(makeSignals([dhikr], { now, prayedToday: { fajr: gracedMark } }))
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })
})

describe('the next prayer', () => {
  const beforeMaghrib = makeItem('before-maghrib', {
    kind: 'prayer',
    prayer: 'maghrib',
    when: 'before',
  })
  const beforeFajr = makeItem('before-fajr', { kind: 'prayer', prayer: 'fajr', when: 'before' })

  it('names the prayer after this one and what content asks around it', () => {
    const result = plan(
      makeSignals([beforeMaghrib, beforeFajr, dhikr, rawatib], { now: startOf('asr') }),
    )
    expect(result.today.next?.prayer).toBe('maghrib')
    expect(result.today.next?.before).toEqual(['before-maghrib'])
    expect(result.today.next?.after).toEqual(['after-any'])
  })

  it('skips sunrise after fajr', () => {
    expect(plan(makeSignals([], { now: startOf('fajr') })).today.next?.prayer).toBe('dhuhr')
  })

  it('wraps from isha to fajr', () => {
    const result = plan(makeSignals([beforeFajr], { now: startOf('isha') }))
    expect(result.today.next?.prayer).toBe('fajr')
    expect(result.today.next?.before).toEqual(['before-fajr'])
  })
})

describe('marking an item done', () => {
  const now = startOf('asr')

  it('moves it out of now and into done, and the next item leads', () => {
    const siwak = makeItem('siwak', { kind: 'prayer', prayer: 'any', when: 'before' })
    const result = plan(
      makeSignals([eveningAdhkar, siwak], {
        now,
        completedToday: { 'evening-adhkar': new Date(now.getTime() - 60_000) },
      }),
    )
    expect(result.today.now.map((entry) => entry.itemId)).toEqual(['siwak'])
    expect(result.today.done.map((entry) => entry.itemId)).toEqual(['evening-adhkar'])
    expect(result.today.rightNow?.itemId).toBe('siwak')
  })

  it('does not count a completion from before the window opened', () => {
    const result = plan(
      makeSignals([eveningAdhkar], {
        now,
        completedToday: { 'evening-adhkar': new Date(now.getTime() - 6 * 3_600_000) },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('evening-adhkar')
  })

  it('owes the after-any dhikr again after the next prayer', () => {
    const dhuhrMark = new Date(now.getTime() - 3 * 3_600_000)
    const asrMark = new Date(now.getTime() - 60_000)
    const doneAfterDhuhr = new Date(dhuhrMark.getTime() + 5 * 60_000)

    const result = plan(
      makeSignals([dhikr], {
        now,
        prayedToday: { dhuhr: dhuhrMark, asr: asrMark },
        completedToday: { 'after-any': doneAfterDhuhr },
      }),
    )
    expect(result.today.rightNow?.itemId).toBe('after-any')
  })

  it('leaves what the next prayer asks untouched', () => {
    const result = plan(makeSignals([dhikr], { now, completedToday: { 'after-any': now } }))
    expect(result.today.next?.after).toEqual(['after-any'])
  })
})

describe('prayer reminders', () => {
  const on = {
    enabledItemIds: ['morning-adhkar'],
    knownItemIds: [],
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, quietHours: null, prayers: true },
  }

  it('are absent unless asked for', () => {
    const result = plan(makeSignals([morningAdhkar]))
    expect(result.notifications.some((entry) => entry.kind === 'prayer')).toBe(false)
  })

  it('fire once per prayer window, never at sunrise', () => {
    const result = plan(makeSignals([morningAdhkar], { preferences: on }))
    const prayers = result.notifications.flatMap((entry) =>
      entry.kind === 'prayer' ? [entry.prayer] : [],
    )
    expect(prayers.slice(0, 5)).toEqual(
      expect.arrayContaining(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']),
    )
    expect(prayers).not.toContain('sunrise')
  })

  it('do not spend the daily budget', () => {
    const result = plan(
      makeSignals([morningAdhkar], {
        preferences: { ...on, notifications: { ...on.notifications, maxPerDay: 1 } },
      }),
    )
    expect(itemIds(result.notifications).length).toBeGreaterThan(0)
  })
})

describe('the schedule over a week', () => {
  it('reaches beyond five days', () => {
    const result = plan(makeSignals([morningAdhkar]))
    const farthest = Math.max(...result.notifications.map((entry) => entry.at.getTime()))
    expect(farthest - anchor.getTime()).toBeGreaterThan(5 * 86_400_000)
  })

  it('names the prayer that closes each adhkar window', () => {
    const result = plan(makeSignals([morningAdhkar, eveningAdhkar]))
    const windows = result.notifications.flatMap((entry) =>
      entry.kind === 'item' && entry.window ? [`${entry.itemId}:${entry.window.closes}`] : [],
    )
    expect(windows).toContain('morning-adhkar:dhuhr')
    expect(windows).toContain('evening-adhkar:maghrib')
  })

  it('sends the look-ahead twenty minutes after the evening adhkar', () => {
    const monday = makeItem('fast-monday', { kind: 'day', day: 'monday' })
    const result = plan(
      makeSignals([eveningAdhkar, monday], {
        upcoming: Array.from({ length: 7 }, (_, index) =>
          dayContext(index + 1, { month: 4, day: 7 + index }),
        ),
      }),
    )
    const evenings = result.notifications.flatMap((entry) =>
      entry.kind === 'item' && entry.itemId === 'evening-adhkar' ? [entry.at.getTime()] : [],
    )
    const aheads = result.notifications.flatMap((entry) =>
      entry.kind === 'item' && entry.itemId === 'fast-monday' ? [entry.at.getTime()] : [],
    )
    expect(aheads.length).toBeGreaterThan(0)
    aheads.forEach((at) => expect(evenings).toContain(at - 20 * 60_000))
  })
})
