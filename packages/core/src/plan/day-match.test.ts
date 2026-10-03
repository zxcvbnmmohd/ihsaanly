import { describe, expect, it } from 'bun:test'
import { matchesDay, matchesWindowDay, readingsDiverge } from './day-match'
import type { DayContext } from './signals'

function context(
  overrides: Omit<Partial<DayContext>, 'hijri'> & { hijri?: Partial<DayContext['hijri']> } = {},
): DayContext {
  const { hijri, ...rest } = overrides
  const base: DayContext = {
    civil: { year: 2026, month: 9, day: 17 },
    hijri: { year: 1448, month: 3, day: 5, ...hijri },
    hijriCalculated: { year: 1448, month: 3, day: 5, ...hijri },
    weekday: 3,
    hijriWeekday: 3,
  }
  return { ...base, ...rest }
}

describe('weekday triggers', () => {
  it('matches Monday and Thursday on the civil weekday', () => {
    expect(matchesDay('monday', context({ weekday: 1 }))).toBe(true)
    expect(matchesDay('monday', context({ weekday: 2 }))).toBe(false)
    expect(matchesDay('thursday', context({ weekday: 4 }))).toBe(true)
    expect(matchesDay('thursday', context({ weekday: 5 }))).toBe(false)
  })

  it('matches Friday on the Islamic weekday, so Thursday night counts', () => {
    expect(matchesDay('friday', context({ weekday: 4, hijriWeekday: 5 }))).toBe(true)
    expect(matchesDay('friday', context({ weekday: 5, hijriWeekday: 6 }))).toBe(false)
  })
})

describe('Hijri triggers', () => {
  it('matches the White Days on the 13th, 14th and 15th only', () => {
    ;[13, 14, 15].forEach((day) =>
      expect(matchesDay('white-days', context({ hijri: { day } }))).toBe(true),
    )
    ;[12, 16].forEach((day) =>
      expect(matchesDay('white-days', context({ hijri: { day } }))).toBe(false),
    )
  })

  it('matches Ashura on 10 Muharram under either reading', () => {
    expect(matchesDay('ashura', context({ hijri: { month: 1, day: 10 } }))).toBe(true)
    expect(matchesDay('ashura', context({ hijri: { month: 1, day: 9 } }))).toBe(false)
    expect(matchesDay('ashura', context({ hijri: { month: 2, day: 10 } }))).toBe(false)
    const diverged = context({
      hijri: { month: 1, day: 11 },
      hijriCalculated: { year: 1448, month: 1, day: 10 },
    })
    expect(matchesDay('ashura', diverged)).toBe(true)
  })

  it('matches Arafah on 9 Dhul Hijjah, surfacing both readings where they differ', () => {
    expect(matchesDay('arafah', context({ hijri: { month: 12, day: 9 } }))).toBe(true)
    expect(matchesDay('arafah', context({ hijri: { month: 11, day: 9 } }))).toBe(false)
    const local = context({
      hijri: { month: 12, day: 9 },
      hijriCalculated: { year: 1448, month: 12, day: 10 },
    })
    expect(matchesDay('arafah', local)).toBe(true)
  })

  it('matches the six days of Shawwal from the 2nd', () => {
    expect(matchesDay('shawwal-6', context({ hijri: { month: 10, day: 1 } }))).toBe(false)
    expect(matchesDay('shawwal-6', context({ hijri: { month: 10, day: 2 } }))).toBe(true)
    expect(matchesDay('shawwal-6', context({ hijri: { month: 10, day: 29 } }))).toBe(true)
    expect(matchesDay('shawwal-6', context({ hijri: { month: 11, day: 5 } }))).toBe(false)
  })

  it('matches the first ten days of Dhul Hijjah', () => {
    expect(matchesDay('dhul-hijjah', context({ hijri: { month: 12, day: 1 } }))).toBe(true)
    expect(matchesDay('dhul-hijjah', context({ hijri: { month: 12, day: 10 } }))).toBe(true)
    expect(matchesDay('dhul-hijjah', context({ hijri: { month: 12, day: 11 } }))).toBe(false)
    expect(matchesDay('dhul-hijjah', context({ hijri: { month: 11, day: 5 } }))).toBe(false)
  })

  it('matches every day of Ramadan', () => {
    expect(matchesDay('ramadan', context({ hijri: { month: 9, day: 1 } }))).toBe(true)
    expect(matchesDay('ramadan', context({ hijri: { month: 9, day: 30 } }))).toBe(true)
    expect(matchesDay('ramadan', context({ hijri: { month: 8, day: 30 } }))).toBe(false)
  })

  it('throws on a day trigger it does not know', () => {
    expect(() => matchesDay('eid' as never, context())).toThrow('Unhandled case')
  })
})

describe('readingsDiverge', () => {
  it('is false when both readings agree', () => {
    expect(readingsDiverge(context())).toBe(false)
  })

  it('is true when the day or the month differs', () => {
    expect(readingsDiverge(context({ hijriCalculated: { year: 1448, month: 3, day: 6 } }))).toBe(
      true,
    )
    expect(readingsDiverge(context({ hijriCalculated: { year: 1448, month: 4, day: 5 } }))).toBe(
      true,
    )
  })
})

describe('matchesWindowDay', () => {
  it('applies every day when the trigger names none', () => {
    expect(matchesWindowDay(undefined, 2)).toBe(true)
  })

  it('narrows a friday trigger to the civil Friday', () => {
    expect(matchesWindowDay('friday', 5)).toBe(true)
    expect(matchesWindowDay('friday', 4)).toBe(false)
  })

  it('throws on a weekday it does not know', () => {
    expect(() => matchesWindowDay('monday' as never, 1)).toThrow('Unhandled case')
  })
})
