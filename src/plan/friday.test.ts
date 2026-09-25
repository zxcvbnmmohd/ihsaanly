import { describe, expect, it } from 'bun:test'

import { items } from '@/content'
import { civilDateIn, civilDateKey } from '@/day/boundaries'
import type { Place } from '@/location/place'
import { notificationContent } from '@/notifications/content'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { prayerTimesAcross, prayerTimesFor } from '@/prayer/times'
import { buildWindows, type PrayerWindow, type WindowName } from '@/prayer/windows'
import { en } from '@/strings/en'

import { dayContextFor } from './day-context'
import { matchesDay, matchesWindowDay } from './day-match'
import { DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences'
import { plan } from './plan'
import type { PlannedItem, Prayer, ScheduledNotification, Signals, TodayModel } from './signals'
import { DEFAULT_USER_STATE, type UserState } from './user-state'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

// 2026-09-24 is a Thursday, 25 a Friday, 26 a Saturday. London is on BST
// (UTC+1): Dhuhr 12:53, Asr 16:05 and Maghrib 18:52 on the Friday.
const THURSDAY = '2026-09-24'
const FRIDAY = '2026-09-25'
const SATURDAY = '2026-09-26'

const FRIDAY_ALL_DAY = ['kahf-friday', 'salawat-friday']
const BEFORE_JUMUAH = ['ghusl-friday', 'early-to-jumuah']

/** An instant given in London's local clock, which is UTC+1 on these dates. */
function londonAt(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+01:00`)
}

function windowOn(day: string, name: WindowName): PrayerWindow {
  const times = prayerTimesAcross(
    london,
    londonAt(day, '12:00'),
    DEFAULT_CALCULATION_PREFERENCES,
    3,
  )
  const window = buildWindows(times).find(
    (candidate) =>
      candidate.name === name &&
      civilDateKey(civilDateIn(candidate.startsAt, london.timeZone)) === day,
  )
  if (!window) throw new Error(`no ${name} window on ${day}`)
  return window
}

function minutesAfter(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000)
}

interface Moment {
  at: Date
  prayed?: Partial<Record<Prayer, Date>>
  completed?: Partial<Record<string, Date>>
  attends?: boolean
  userState?: UserState
  maxPerDay?: number
  /** Off by default, turned on for this moment. */
  alsoEnabled?: string[]
}

function signalsAt({
  at,
  prayed = {},
  completed = {},
  attends = true,
  userState = DEFAULT_USER_STATE,
  maxPerDay = DEFAULT_NOTIFICATION_PREFERENCES.maxPerDay,
  alsoEnabled = [],
}: Moment): Signals {
  const { maghrib } = prayerTimesFor(london, at, DEFAULT_CALCULATION_PREFERENCES)
  return {
    now: at,
    timeZone: london.timeZone,
    items,
    prayerTimes: prayerTimesAcross(london, at, DEFAULT_CALCULATION_PREFERENCES, 8),
    today: dayContextFor(at, london.timeZone, 0, 0, maghrib),
    upcoming: Array.from({ length: 7 }, (_, index) =>
      dayContextFor(at, london.timeZone, index + 1, 0, null),
    ),
    prayedToday: prayed,
    completedToday: completed,
    activeEvents: [],
    userState,
    attendsJumuah: attends,
    preferences: {
      enabledItemIds: [
        ...items.filter((item) => item.defaultOn).map((item) => item.id),
        ...alsoEnabled,
      ],
      knownItemIds: [],
      notifications: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        prayers: true,
        quietHours: null,
        maxPerDay,
      },
    },
  }
}

function todayAt(moment: Moment): TodayModel {
  return plan(signalsAt(moment)).today
}

function ids(entries: PlannedItem[]): string[] {
  return entries.map((entry) => entry.itemId)
}

function allDay(today: TodayModel): PlannedItem[] {
  return today.comingUp.filter((entry) => entry.reason === 'today')
}

function tomorrow(today: TodayModel): PlannedItem[] {
  return today.comingUp.filter((entry) => entry.reason === 'upcoming' && entry.daysAway === 1)
}

function itemOn(
  day: string,
  scheduled: ScheduledNotification[],
  id: string,
): ScheduledNotification[] {
  return scheduled.filter(
    (entry) =>
      entry.kind === 'item' &&
      entry.itemId === id &&
      civilDateKey(civilDateIn(entry.at, london.timeZone)) === day,
  )
}

describe("Friday's content", () => {
  const byId = (id: string): (typeof items)[number] | undefined =>
    items.find((item) => item.id === id)

  it('ships all five, drafted and awaiting review, on by default', () => {
    ;[...BEFORE_JUMUAH, ...FRIDAY_ALL_DAY, 'friday-last-hour'].forEach((id) => {
      const item = byId(id)
      expect(item?.reviewed).toBe(false)
      expect(item?.defaultOn).toBe(true)
    })
  })

  it('ties each to the trigger it needs', () => {
    BEFORE_JUMUAH.forEach((id) =>
      expect(byId(id)?.trigger).toEqual({ kind: 'prayer', prayer: 'jumuah', when: 'before' }),
    )
    FRIDAY_ALL_DAY.forEach((id) =>
      expect(byId(id)?.trigger).toEqual({ kind: 'day', day: 'friday' }),
    )
    expect(byId('friday-last-hour')?.trigger).toEqual({
      kind: 'window',
      window: 'evening',
      day: 'friday',
    })
  })

  it('cites the narrations it was given, and names a grader outside the two Sahihs', () => {
    const citations = (id: string): string[] =>
      (byId(id)?.evidence ?? []).map((evidence) =>
        evidence.type === 'hadith'
          ? `${evidence.collection} ${evidence.reference} ${evidence.gradedBy ?? '-'}`
          : 'quran',
      )

    expect(citations('ghusl-friday')).toEqual(['Sahih al-Bukhari 877 -', 'Sahih al-Bukhari 880 -'])
    expect(citations('early-to-jumuah')).toEqual(['Sahih al-Bukhari 881 -'])
    expect(citations('kahf-friday')).toEqual([
      "al-Hakim and al-Bayhaqi (Sahih al-Jami' 6470) al-Albani",
    ])
    expect(citations('salawat-friday')).toEqual(['Sunan Abi Dawud 1047 al-Albani'])
    expect(citations('friday-last-hour')).toEqual([
      'Sahih al-Bukhari 935 -',
      'Sunan Abi Dawud 1048 al-Albani',
    ])
  })
})

describe('which day is Friday', () => {
  it('turns at Maghrib for everything Friday asks of everyone', () => {
    const { maghrib } = prayerTimesFor(
      london,
      londonAt(THURSDAY, '12:00'),
      DEFAULT_CALCULATION_PREFERENCES,
    )
    const afternoon = dayContextFor(londonAt(THURSDAY, '17:00'), london.timeZone, 0, 0, maghrib)
    const night = dayContextFor(londonAt(THURSDAY, '20:00'), london.timeZone, 0, 0, maghrib)

    expect(afternoon.weekday).toBe(4)
    expect(afternoon.hijriWeekday).toBe(4)
    expect(night.weekday).toBe(4)
    expect(night.hijriWeekday).toBe(5)
    expect(matchesDay('friday', afternoon)).toBe(false)
    expect(matchesDay('friday', night)).toBe(true)
    // Fasting Thursday keeps the civil day.
    expect(matchesDay('thursday', night)).toBe(true)
  })

  it('asks a look-ahead day about its daytime', () => {
    const friday = dayContextFor(londonAt(THURSDAY, '20:00'), london.timeZone, 1, 0, null)
    expect(friday.weekday).toBe(5)
    expect(friday.hijriWeekday).toBe(5)
  })

  it('narrows a window to a civil weekday, and leaves an unnarrowed one alone', () => {
    expect(matchesWindowDay('friday', 5)).toBe(true)
    expect(matchesWindowDay('friday', 4)).toBe(false)
    ;[0, 1, 2, 3, 4, 5, 6].forEach((weekday) =>
      expect(matchesWindowDay(undefined, weekday)).toBe(true),
    )
  })
})

describe("before Jumu'ah", () => {
  const dhuhr = windowOn(FRIDAY, 'dhuhr')
  const marked = minutesAfter(dhuhr.startsAt, 50)

  it('lists the ghusl and going early under Up next on Friday morning', () => {
    const today = todayAt({ at: londonAt(FRIDAY, '09:00') })
    expect(today.next?.prayer).toBe('dhuhr')
    expect(today.next?.jumuah).toBe(true)
    BEFORE_JUMUAH.forEach((id) => {
      expect(today.next?.before).toContain(id)
      // "Before" belongs to the prayer's own window, as it does for every prayer.
      expect(ids(today.now)).not.toContain(id)
    })
  })

  it('raises them as before-prayer items once the time enters, until the mark', () => {
    const today = todayAt({ at: minutesAfter(dhuhr.startsAt, 5) })
    BEFORE_JUMUAH.forEach((id) =>
      expect(today.now.find((entry) => entry.itemId === id)?.reason).toBe('before-prayer'),
    )
  })

  it('lets them go once the dhuhr mark is made', () => {
    const now = ids(todayAt({ at: minutesAfter(marked, 10), prayed: { dhuhr: marked } }).now)
    BEFORE_JUMUAH.forEach((id) => expect(now).not.toContain(id))
    expect(now).toContain('sunnah-after-jumuah')
  })

  it('shows neither to someone who prays Dhuhr on Friday', () => {
    const morning = todayAt({ at: londonAt(FRIDAY, '09:00'), attends: false })
    const inWindow = todayAt({ at: minutesAfter(dhuhr.startsAt, 5), attends: false })
    BEFORE_JUMUAH.forEach((id) => {
      expect(morning.next?.before).not.toContain(id)
      expect(ids(inWindow.now)).not.toContain(id)
    })
    expect(ids(inWindow.now)).toContain('sunnah-before-dhuhr')
  })

  it('keeps them for someone who attends while travelling, though the sunnah after steps aside', () => {
    const userState: UserState = { ...DEFAULT_USER_STATE, travelling: true, jumuah: 'attend' }
    const inWindow = ids(todayAt({ at: minutesAfter(dhuhr.startsAt, 5), userState }).now)
    BEFORE_JUMUAH.forEach((id) => expect(inWindow).toContain(id))

    const after = ids(
      todayAt({ at: minutesAfter(marked, 10), prayed: { dhuhr: marked }, userState }).now,
    )
    expect(after).not.toContain('sunnah-after-jumuah')
  })

  it('asks nothing of Thursday or Saturday', () => {
    ;[THURSDAY, SATURDAY].forEach((day) => {
      const morning = todayAt({ at: londonAt(day, '09:00') })
      const inWindow = todayAt({ at: minutesAfter(windowOn(day, 'dhuhr').startsAt, 5) })
      BEFORE_JUMUAH.forEach((id) => {
        expect(morning.next?.before).not.toContain(id)
        expect(ids(inWindow.now)).not.toContain(id)
      })
    })
  })
})

describe('al-Kahf and the salawat, from Thursday’s Maghrib to Friday’s', () => {
  const fridayMoments = ['09:00', '12:30', '18:00']

  ;[true, false].forEach((attends) => {
    it(`are today’s all Friday for ${attends ? 'someone who attends' : 'someone who prays Dhuhr'}`, () => {
      fridayMoments.forEach((time) => {
        const today = todayAt({ at: londonAt(FRIDAY, time), attends })
        const entries = allDay(today).filter((entry) => FRIDAY_ALL_DAY.includes(entry.itemId))
        expect(ids(entries).sort()).toEqual([...FRIDAY_ALL_DAY].sort())
        // Knowing it is Friday consults no calendar, so it is not offered as "expected".
        entries.forEach((entry) => expect(entry.caveat).toBeUndefined())
        // A calendar day is never the right-now card.
        FRIDAY_ALL_DAY.forEach((id) => expect(ids(today.now)).not.toContain(id))
      })
    })
  })

  it('are tomorrow’s during Thursday’s daytime, not today’s', () => {
    ;['12:00', '18:30'].forEach((time) => {
      const today = todayAt({ at: londonAt(THURSDAY, time) })
      FRIDAY_ALL_DAY.forEach((id) => {
        expect(ids(allDay(today))).not.toContain(id)
        expect(ids(tomorrow(today))).toContain(id)
      })
    })
  })

  it('begin at Thursday’s Maghrib, listed once as today rather than again as tomorrow', () => {
    const maghrib = windowOn(THURSDAY, 'maghrib').startsAt
    const justBefore = todayAt({ at: minutesAfter(maghrib, -1) })
    const justAfter = todayAt({ at: minutesAfter(maghrib, 1) })
    const evening = todayAt({ at: londonAt(THURSDAY, '20:00') })

    FRIDAY_ALL_DAY.forEach((id) => {
      expect(ids(allDay(justBefore))).not.toContain(id)
      expect(ids(allDay(justAfter))).toContain(id)
      expect(ids(allDay(evening))).toContain(id)
      expect(ids(tomorrow(evening))).not.toContain(id)
    })
  })

  it('end at Friday’s Maghrib', () => {
    const maghrib = windowOn(FRIDAY, 'maghrib').startsAt
    const justBefore = todayAt({ at: minutesAfter(maghrib, -1) })
    const evening = todayAt({ at: londonAt(FRIDAY, '20:00') })

    FRIDAY_ALL_DAY.forEach((id) => {
      expect(ids(allDay(justBefore))).toContain(id)
      expect(ids(allDay(evening))).not.toContain(id)
      // The next Friday is a whole week off.
      expect(tomorrow(evening).map((entry) => entry.itemId)).not.toContain(id)
    })
  })

  it('are absent on Saturday, and a week off in the look-ahead', () => {
    const today = todayAt({ at: londonAt(SATURDAY, '12:00') })
    FRIDAY_ALL_DAY.forEach((id) => {
      expect(ids(allDay(today))).not.toContain(id)
      expect(ids(tomorrow(today))).not.toContain(id)
      expect(today.comingUp.find((entry) => entry.itemId === id)?.daysAway).toBe(6)
    })
  })

  it('leaves a civil-day item’s tomorrow alone after Maghrib', () => {
    // Only an entry repeating the Islamic day in progress is dropped: on Sunday
    // night, Monday's fast is still tomorrow's.
    const today = todayAt({ at: londonAt('2026-09-27', '20:00'), alsoEnabled: ['fast-monday'] })
    expect(ids(tomorrow(today))).toContain('fast-monday')
    expect(ids(allDay(today))).not.toContain('fast-monday')
  })
})

describe('the last hour of Friday', () => {
  const asr = windowOn(FRIDAY, 'asr')

  it('is open from Asr until Maghrib on Friday, beside the evening adhkar', () => {
    const today = todayAt({ at: minutesAfter(asr.startsAt, 1) })
    expect(today.now.find((entry) => entry.itemId === 'friday-last-hour')?.reason).toBe(
      'current-window',
    )
    expect(ids(today.now)).toContain('evening-adhkar')
    expect(ids(todayAt({ at: londonAt(FRIDAY, '18:00') }).now)).toContain('friday-last-hour')
    expect(ids(todayAt({ at: minutesAfter(asr.endsAt, -1) }).now)).toContain('friday-last-hour')
  })

  it('is closed before Asr and after Maghrib', () => {
    expect(ids(todayAt({ at: minutesAfter(asr.startsAt, -1) }).now)).not.toContain(
      'friday-last-hour',
    )
    expect(ids(todayAt({ at: minutesAfter(asr.endsAt, 1) }).now)).not.toContain('friday-last-hour')
  })

  it('is the same for someone who prays Dhuhr', () => {
    const now = ids(todayAt({ at: minutesAfter(asr.startsAt, 1), attends: false }).now)
    expect(now).toContain('friday-last-hour')
  })

  it("is not Thursday's or Saturday's, whose evening adhkar are unchanged", () => {
    ;[THURSDAY, SATURDAY].forEach((day) => {
      const now = ids(todayAt({ at: minutesAfter(windowOn(day, 'asr').startsAt, 1) }).now)
      expect(now).not.toContain('friday-last-hour')
      expect(now).toContain('evening-adhkar')
    })
  })

  it('counts as done for this window once completed after Asr', () => {
    const today = todayAt({
      at: minutesAfter(asr.startsAt, 30),
      completed: { 'friday-last-hour': minutesAfter(asr.startsAt, 20) },
    })
    expect(ids(today.now)).not.toContain('friday-last-hour')
    expect(ids(today.done)).toContain('friday-last-hour')
  })
})

describe('reminders for Friday', () => {
  const scheduled = plan(
    signalsAt({ at: londonAt(THURSDAY, '09:00'), maxPerDay: 10 }),
  ).notifications

  it("reminds of the last hour at Friday's Asr only, until Maghrib", () => {
    expect(itemOn(THURSDAY, scheduled, 'friday-last-hour')).toHaveLength(0)
    expect(itemOn(SATURDAY, scheduled, 'friday-last-hour')).toHaveLength(0)

    const [friday, ...rest] = itemOn(FRIDAY, scheduled, 'friday-last-hour')
    expect(rest).toHaveLength(0)
    if (!friday || friday.kind !== 'item') throw new Error('no Friday last-hour reminder')
    expect(friday.at).toEqual(windowOn(FRIDAY, 'asr').startsAt)
    expect(friday.reason).toBe('current-window')
    expect(friday.window).toMatchObject({
      closes: 'maghrib',
      endsAt: windowOn(FRIDAY, 'asr').endsAt,
    })
    expect(notificationContent(friday, items, en)?.body).toBe(
      'The last hour of Friday is here. Ask Allah for what you need before Maghrib.',
    )
  })

  it('keeps the evening adhkar on every day', () => {
    ;[THURSDAY, FRIDAY, SATURDAY].forEach((day) =>
      expect(itemOn(day, scheduled, 'evening-adhkar')).toHaveLength(1),
    )
  })

  it('looks ahead to al-Kahf and the salawat on Thursday afternoon, before Friday begins', () => {
    FRIDAY_ALL_DAY.forEach((id) => {
      const [entry, ...rest] = itemOn(THURSDAY, scheduled, id)
      expect(rest).toHaveLength(0)
      if (!entry || entry.kind !== 'item') throw new Error(`no look-ahead for ${id}`)
      expect(entry.reason).toBe('upcoming')
      expect(entry.at < windowOn(THURSDAY, 'maghrib').startsAt).toBe(true)
      expect(itemOn(FRIDAY, scheduled, id)).toHaveLength(0)
    })
  })

  it('never schedules the ghusl or going early, which answer to the prayer', () => {
    BEFORE_JUMUAH.forEach((id) =>
      expect(scheduled.some((entry) => entry.kind === 'item' && entry.itemId === id)).toBe(false),
    )
  })
})
