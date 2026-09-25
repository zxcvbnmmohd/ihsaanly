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
import {
  attendsJumuah,
  isJumuahAt,
  isJumuahDay,
  prayerName,
  prayerNames,
  resolveTriggerPrayer,
  windowName,
} from './jumuah'
import { DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences'
import { plan } from './plan'
import type { Prayer, Signals } from './signals'
import { DEFAULT_USER_STATE, UserState } from './user-state'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

// 2026-09-24 is a Thursday, 25 a Friday, 26 a Saturday.
const THURSDAY = '2026-09-24'
const FRIDAY = '2026-09-25'
const SATURDAY = '2026-09-26'

function noonOf(day: string): Date {
  return new Date(`${day}T11:00:00Z`)
}

function windowOn(day: string, name: WindowName): PrayerWindow {
  const times = prayerTimesAcross(london, noonOf(day), DEFAULT_CALCULATION_PREFERENCES, 3)
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
}

function signalsAt({
  at,
  prayed = {},
  completed = {},
  attends = true,
  userState = DEFAULT_USER_STATE,
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
      enabledItemIds: items.filter((item) => item.defaultOn).map((item) => item.id),
      knownItemIds: [],
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, prayers: true, quietHours: null },
    },
  }
}

function nowIds(signals: Signals): string[] {
  return plan(signals).today.now.map((entry) => entry.itemId)
}

describe("who prays Jumu'ah", () => {
  it('resolves automatic from travelling and the onboarding answer', () => {
    expect(attendsJumuah('auto', false, 'male')).toBe(true)
    expect(attendsJumuah('auto', false, 'unspecified')).toBe(true)
    expect(attendsJumuah('auto', false, 'female')).toBe(false)
    expect(attendsJumuah('auto', true, 'male')).toBe(false)
    expect(attendsJumuah('auto', true, 'unspecified')).toBe(false)
    expect(attendsJumuah('auto', true, 'female')).toBe(false)
  })

  it('lets an explicit choice win over both', () => {
    for (const travelling of [true, false]) {
      for (const gender of ['female', 'male', 'unspecified'] as const) {
        expect(attendsJumuah('attend', travelling, gender)).toBe(true)
        expect(attendsJumuah('dhuhr', travelling, gender)).toBe(false)
      }
    }
  })

  it('reads a row stored before the setting existed as automatic', () => {
    const parsed = UserState.safeParse({ travelling: true, trackingPaused: false })
    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual({ travelling: true, trackingPaused: false, jumuah: 'auto' })
    expect(DEFAULT_USER_STATE.jumuah).toBe('auto')
  })
})

describe("which day is a Jumu'ah day", () => {
  it('is the civil Friday, only for someone who attends', () => {
    expect(isJumuahDay({ weekday: 5 }, true)).toBe(true)
    expect(isJumuahDay({ weekday: 5 }, false)).toBe(false)
    expect(isJumuahDay({ weekday: 4 }, true)).toBe(false)
    expect(isJumuahDay({ weekday: 6 }, true)).toBe(false)
  })

  it('follows the local calendar, not UTC', () => {
    // 23:30 UTC on Thursday is already Friday in Tokyo and still Thursday in New York.
    const instant = new Date(`${THURSDAY}T23:30:00Z`)
    expect(isJumuahAt(instant, 'Asia/Tokyo', true)).toBe(true)
    expect(isJumuahAt(instant, 'America/New_York', true)).toBe(false)
  })
})

describe('triggers on a Jumu’ah day', () => {
  it('swaps dhuhr for jumuah and leaves every other prayer alone', () => {
    expect(resolveTriggerPrayer('dhuhr', true)).toBeNull()
    expect(resolveTriggerPrayer('jumuah', true)).toBe('dhuhr')
    expect(resolveTriggerPrayer('dhuhr', false)).toBe('dhuhr')
    expect(resolveTriggerPrayer('jumuah', false)).toBeNull()
    expect(resolveTriggerPrayer('any', true)).toBe('any')
    expect(resolveTriggerPrayer('asr', true)).toBe('asr')
  })

  it('ships the sunnah after Jumu’ah on the jumuah trigger', () => {
    const item = items.find((candidate) => candidate.id === 'sunnah-after-jumuah')
    expect(item?.trigger).toEqual({ kind: 'prayer', prayer: 'jumuah', when: 'after' })
    expect(item?.reviewed).toBe(false)
    expect(
      item?.evidence.map((evidence) => evidence.type === 'hadith' && evidence.reference),
    ).toEqual(['881', '937'])
  })
})

describe('Friday for someone who prays Jumu’ah', () => {
  const dhuhr = windowOn(FRIDAY, 'dhuhr')
  const marked = minutesAfter(dhuhr.startsAt, 50)

  it('names the midday window and prayer Jumu’ah', () => {
    const today = plan(signalsAt({ at: minutesAfter(dhuhr.startsAt, 1) })).today
    expect(today.window).toBe('dhuhr')
    expect(today.jumuah).toBe(true)
    expect(windowName(en, 'dhuhr', today.jumuah)).toBe("After Jumu'ah")
    expect(prayerName(en, 'dhuhr', today.jumuah)).toBe("Jumu'ah")
    expect(prayerNames(en, today.jumuah)).toEqual({
      fajr: 'Fajr',
      dhuhr: "Jumu'ah",
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
    })
  })

  it('drops the sunnah before Dhuhr while the window is open', () => {
    const ids = nowIds(signalsAt({ at: minutesAfter(dhuhr.startsAt, 1) }))
    expect(ids).not.toContain('sunnah-before-dhuhr')
    expect(ids).not.toContain('sunnah-after-jumuah')
  })

  it('raises the sunnah after Jumu’ah once the dhuhr mark is made, and not the Dhuhr one', () => {
    const result = plan(signalsAt({ at: minutesAfter(marked, 10), prayed: { dhuhr: marked } }))
    const ids = result.today.now.map((entry) => entry.itemId)
    expect(ids).toContain('sunnah-after-jumuah')
    expect(ids).not.toContain('sunnah-after-dhuhr')
    expect(ids).not.toContain('sunnah-before-dhuhr')
    expect(result.today.now.find((entry) => entry.itemId === 'sunnah-after-jumuah')?.reason).toBe(
      'after-prayer',
    )
    // The tasbih after any prayer still answers the same mark.
    expect(ids).toContain('tasbih-after-prayer')
  })

  it('lets it go when the after-prayer grace runs out', () => {
    const ids = nowIds(signalsAt({ at: minutesAfter(marked, 61), prayed: { dhuhr: marked } }))
    expect(ids).not.toContain('sunnah-after-jumuah')
  })

  it('counts it done for this Jumu’ah once completed after the mark', () => {
    const result = plan(
      signalsAt({
        at: minutesAfter(marked, 20),
        prayed: { dhuhr: marked },
        completed: { 'sunnah-after-jumuah': minutesAfter(marked, 15) },
      }),
    )
    expect(result.today.now.map((entry) => entry.itemId)).not.toContain('sunnah-after-jumuah')
    expect(result.today.done.map((entry) => entry.itemId)).toContain('sunnah-after-jumuah')
  })

  it('lists the sunnah after Jumu’ah under Up next on Friday morning', () => {
    const next = plan(signalsAt({ at: minutesAfter(windowOn(FRIDAY, 'sunrise').startsAt, 120) }))
      .today.next
    expect(next?.prayer).toBe('dhuhr')
    expect(next?.jumuah).toBe(true)
    expect(next?.after).toContain('sunnah-after-jumuah')
    expect(next?.after).not.toContain('sunnah-after-dhuhr')
    expect(next?.before).not.toContain('sunnah-before-dhuhr')
  })

  it('steps the sunnah aside for someone who attends while travelling', () => {
    const ids = nowIds(
      signalsAt({
        at: minutesAfter(marked, 10),
        prayed: { dhuhr: marked },
        userState: { ...DEFAULT_USER_STATE, travelling: true, jumuah: 'attend' },
      }),
    )
    expect(ids).not.toContain('sunnah-after-jumuah')
    expect(ids).not.toContain('sunnah-after-dhuhr')
  })
})

describe('Friday for someone who prays Dhuhr, and the days around it', () => {
  const cases: [string, string, boolean][] = [
    ['Friday, praying Dhuhr', FRIDAY, false],
    ['Thursday', THURSDAY, true],
    ['Saturday', SATURDAY, true],
  ]

  cases.forEach(([label, day, attends]) => {
    it(`keeps the Dhuhr sunnah on ${label}`, () => {
      const dhuhr = windowOn(day, 'dhuhr')
      const marked = minutesAfter(dhuhr.startsAt, 50)

      const before = plan(signalsAt({ at: minutesAfter(dhuhr.startsAt, 1), attends })).today
      expect(before.jumuah).toBe(false)
      expect(before.now.map((entry) => entry.itemId)).toContain('sunnah-before-dhuhr')
      expect(windowName(en, 'dhuhr', before.jumuah)).toBe('After Dhuhr')

      const after = nowIds(
        signalsAt({ at: minutesAfter(marked, 10), prayed: { dhuhr: marked }, attends }),
      )
      expect(after).toContain('sunnah-after-dhuhr')
      expect(after).not.toContain('sunnah-after-jumuah')

      const next = plan(
        signalsAt({ at: minutesAfter(windowOn(day, 'sunrise').startsAt, 120), attends }),
      ).today.next
      expect(next?.jumuah).toBe(false)
      expect(next?.after).toContain('sunnah-after-dhuhr')
      expect(next?.after).not.toContain('sunnah-after-jumuah')
    })
  })
})

describe('reminders across a Friday', () => {
  const thursdayEvening = new Date(`${THURSDAY}T19:00:00Z`)
  const scheduled = plan(signalsAt({ at: thursdayEvening })).notifications

  it("flags only Friday's midday prayer reminder as Jumu'ah, and names it so", () => {
    const dhuhrs = scheduled.flatMap((entry) =>
      entry.kind === 'prayer' && entry.prayer === 'dhuhr' ? [entry] : [],
    )
    const friday = dhuhrs.filter(
      (entry) => civilDateKey(civilDateIn(entry.at, london.timeZone)) === FRIDAY,
    )
    const others = dhuhrs.filter(
      (entry) => civilDateKey(civilDateIn(entry.at, london.timeZone)) !== FRIDAY,
    )

    expect(friday).toHaveLength(1)
    expect(others.length).toBeGreaterThan(0)
    expect(friday.every((entry) => entry.jumuah)).toBe(true)
    expect(others.every((entry) => !entry.jumuah)).toBe(true)

    const [fridayDhuhr] = friday
    if (!fridayDhuhr) throw new Error('no Friday dhuhr reminder')
    expect(notificationContent(fridayDhuhr, items, en)?.title).toBe("Jumu'ah")
    const [otherDhuhr] = others
    if (!otherDhuhr) throw new Error('no other dhuhr reminder')
    expect(notificationContent(otherDhuhr, items, en)?.title).toBe('Dhuhr')
  })

  it("says Friday's morning adhkar are open until Jumu'ah", () => {
    const morning = scheduled.find(
      (entry) =>
        entry.kind === 'item' &&
        entry.itemId === 'morning-adhkar' &&
        civilDateKey(civilDateIn(entry.at, london.timeZone)) === FRIDAY,
    )
    if (!morning || morning.kind !== 'item') throw new Error('no Friday morning reminder')
    expect(morning.window).toMatchObject({ closes: 'dhuhr', jumuah: true })

    const withoutOwnSentence = items.map((item) =>
      item.id === 'morning-adhkar' ? { ...item, reminder: null } : item,
    )
    expect(notificationContent(morning, withoutOwnSentence, en)?.body).toBe("Open until Jumu'ah.")
  })
})
