import { describe, expect, it } from 'bun:test'

import { CHECK_IN_DAYS, CHECK_IN_HOUR, checkInAt, checkInDate, isCheckInDue } from './check-in'
import { DEFAULT_USER_STATE } from './user-state'

const today = { year: 2026, month: 9, day: 28 }

describe('checkInDate', () => {
  it('counts the days from today, across a month end', () => {
    expect(checkInDate(today, CHECK_IN_DAYS.default)).toBe('2026-10-05')
    expect(checkInDate(today, 3)).toBe('2026-10-01')
  })

  it('holds the days to the offered range', () => {
    expect(checkInDate(today, 1)).toBe(checkInDate(today, CHECK_IN_DAYS.min))
    expect(checkInDate(today, 40)).toBe(checkInDate(today, CHECK_IN_DAYS.max))
    expect(checkInDate(today, 6.6)).toBe('2026-10-05')
  })
})

describe('isCheckInDue', () => {
  const paused = { ...DEFAULT_USER_STATE, trackingPaused: true, pauseCheckInOn: '2026-10-05' }

  it('is due on the day and after it, while paused', () => {
    expect(isCheckInDue(paused, { year: 2026, month: 10, day: 4 })).toBe(false)
    expect(isCheckInDue(paused, { year: 2026, month: 10, day: 5 })).toBe(true)
    expect(isCheckInDue(paused, { year: 2026, month: 11, day: 1 })).toBe(true)
  })

  it('is never due unpaused, or with no check-in', () => {
    const day = { year: 2026, month: 10, day: 6 }
    expect(isCheckInDue({ ...paused, trackingPaused: false }, day)).toBe(false)
    expect(isCheckInDue({ ...paused, pauseCheckInOn: null }, day)).toBe(false)
    expect(isCheckInDue({ travelling: false, trackingPaused: true, jumuah: 'auto' }, day)).toBe(
      false,
    )
  })
})

describe('checkInAt', () => {
  const hourIn = (at: Date, timeZone: string): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(at)

  it('is the check-in hour on that day, in the place’s own zone', () => {
    for (const zone of ['America/Toronto', 'Asia/Kolkata', 'Pacific/Auckland', 'UTC']) {
      expect(hourIn(checkInAt('2026-10-05', zone), zone)).toBe(`2026-10-05, ${CHECK_IN_HOUR}:00`)
    }
  })

  it('stays right on a day the clocks change', () => {
    expect(hourIn(checkInAt('2026-11-01', 'America/Toronto'), 'America/Toronto')).toBe(
      `2026-11-01, ${CHECK_IN_HOUR}:00`,
    )
  })
})
