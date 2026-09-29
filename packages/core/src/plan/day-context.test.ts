import { describe, expect, it } from 'bun:test'

import { dayContextFor } from './day-context'

const ZONE = 'Europe/London'
// 21 September 2026, with Maghrib at 19:00 local.
const MAGHRIB = new Date('2026-09-21T18:00:00.000Z')
const BEFORE = new Date('2026-09-21T17:00:00.000Z')
const AFTER = new Date('2026-09-21T21:47:00.000Z')

describe('dayContextFor', () => {
  it('keeps the civil day on the calendar boundary, before and after Maghrib', () => {
    expect(dayContextFor(BEFORE, ZONE, 0, 0, MAGHRIB).civil.day).toBe(21)
    expect(dayContextFor(AFTER, ZONE, 0, 0, MAGHRIB).civil.day).toBe(21)
  })

  it('turns the Hijri date at Maghrib rather than at midnight', () => {
    const before = dayContextFor(BEFORE, ZONE, 0, 0, MAGHRIB).hijri
    const after = dayContextFor(AFTER, ZONE, 0, 0, MAGHRIB).hijri

    expect(after.day).toBe(before.day + 1)
  })

  it('applies the user offset to the shifted day, not the calendar day', () => {
    const plain = dayContextFor(AFTER, ZONE, 0, 0, MAGHRIB)
    const shifted = dayContextFor(AFTER, ZONE, 0, 1, MAGHRIB)

    expect(shifted.hijri.day).toBe(plain.hijri.day + 1)
    // The uncorrected calendar is what Makkah follows, so the offset must not reach it.
    expect(shifted.hijriCalculated.day).toBe(plain.hijriCalculated.day)
  })

  it('asks a look-ahead day for the date its daytime carries, ignoring tonight', () => {
    const tomorrow = dayContextFor(AFTER, ZONE, 1, 0, null)

    expect(tomorrow.civil.day).toBe(22)
    expect(tomorrow.hijri.day).toBe(dayContextFor(AFTER, ZONE, 0, 0, MAGHRIB).hijri.day)
  })

  it('reports the weekday of the civil day', () => {
    // 21 September 2026 is a Monday.
    expect(dayContextFor(BEFORE, ZONE, 0, 0, MAGHRIB).weekday).toBe(1)
  })
})
