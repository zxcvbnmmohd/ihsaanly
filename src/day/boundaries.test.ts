import { describe, expect, it } from 'bun:test'

import { civilDateIn, hijriDay, isSameCivilDate, logDay, shiftDays } from './boundaries'

const TORONTO = 'America/Toronto'

// 2026-09-17, Maghrib in Toronto falls around 19:20 local (23:20 UTC).
const maghrib = new Date('2026-09-17T23:20:00Z')

describe('civil dates', () => {
  it('reads the local calendar date, not the UTC one', () => {
    const lateEvening = new Date('2026-09-18T02:00:00Z') // 22:00 on the 17th in Toronto
    expect(civilDateIn(lateEvening, TORONTO)).toEqual({ year: 2026, month: 9, day: 17 })
  })

  it('shifts across a month boundary', () => {
    expect(shiftDays({ year: 2026, month: 9, day: 30 }, 1)).toEqual({
      year: 2026,
      month: 10,
      day: 1,
    })
    expect(shiftDays({ year: 2026, month: 1, day: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
      day: 31,
    })
  })
})

describe('the two day boundaries', () => {
  it('agree before Maghrib', () => {
    const afternoon = new Date('2026-09-17T18:00:00Z') // 14:00 in Toronto
    expect(isSameCivilDate(logDay(afternoon, TORONTO), hijriDay(afternoon, maghrib, TORONTO))).toBe(
      true,
    )
  })

  it('diverge after Maghrib: the Islamic day has already turned', () => {
    const afterMaghrib = new Date('2026-09-18T00:00:00Z') // 20:00 on the 17th in Toronto

    expect(logDay(afterMaghrib, TORONTO)).toEqual({ year: 2026, month: 9, day: 17 })
    expect(hijriDay(afterMaghrib, maghrib, TORONTO)).toEqual({ year: 2026, month: 9, day: 18 })
  })

  it('agree again after local midnight', () => {
    const afterMidnight = new Date('2026-09-18T05:00:00Z') // 01:00 on the 18th in Toronto
    const nextMaghrib = new Date('2026-09-18T23:18:00Z')

    expect(logDay(afterMidnight, TORONTO)).toEqual({ year: 2026, month: 9, day: 18 })
    expect(hijriDay(afterMidnight, nextMaghrib, TORONTO)).toEqual({
      year: 2026,
      month: 9,
      day: 18,
    })
  })
})
