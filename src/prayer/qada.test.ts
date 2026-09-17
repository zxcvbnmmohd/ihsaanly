import { describe, expect, it } from 'bun:test'

import type { Place } from '@/location/place'

import { DEFAULT_CALCULATION_PREFERENCES } from './calculation'
import { missedPrayers, PRAYERS, windowClosedAt } from './qada'
import { prayerTimesAcross } from './times'

const toronto: Place = {
  label: 'Toronto, Ontario, Canada',
  latitude: 43.7,
  longitude: -79.42,
  timeZone: 'America/Toronto',
  source: 'city',
}

const [, today, tomorrow] = prayerTimesAcross(
  toronto,
  new Date('2026-09-17T12:00:00Z'),
  DEFAULT_CALCULATION_PREFERENCES,
)
if (!today || !tomorrow) throw new Error('fixture needs three days')

describe('when a prayer window closes', () => {
  it('ends at the following boundary', () => {
    expect(windowClosedAt('fajr', today, tomorrow)).toEqual(today.sunrise)
    expect(windowClosedAt('dhuhr', today, tomorrow)).toEqual(today.asr)
  })

  it('carries Isha past midnight to the next Fajr', () => {
    expect(windowClosedAt('isha', today, tomorrow)).toEqual(tomorrow.fajr)
    expect(windowClosedAt('isha', today, tomorrow).getTime()).toBeGreaterThan(today.isha.getTime())
  })
})

describe('what counts as missed', () => {
  it('counts nothing before the day begins', () => {
    const beforeFajr = new Date(today.fajr.getTime() - 60_000)
    expect(missedPrayers(today, tomorrow, [], beforeFajr)).toEqual([])
  })

  it('does not count a window that is still open', () => {
    const duringDhuhr = new Date(today.dhuhr.getTime() + 60_000)
    expect(missedPrayers(today, tomorrow, [], duringDhuhr)).not.toContain('dhuhr')
  })

  it('counts a window once it has closed unmarked', () => {
    const afterAsrBegins = new Date(today.asr.getTime() + 60_000)
    expect(missedPrayers(today, tomorrow, [], afterAsrBegins)).toContain('dhuhr')
  })

  it('does not count a prayer that was marked', () => {
    const afterAsrBegins = new Date(today.asr.getTime() + 60_000)
    expect(missedPrayers(today, tomorrow, ['fajr', 'dhuhr'], afterAsrBegins)).toEqual([])
  })

  it('counts the whole day once the next Fajr arrives', () => {
    const nextMorning = new Date(tomorrow.fajr.getTime() + 60_000)
    expect(missedPrayers(today, tomorrow, [], nextMorning)).toEqual(PRAYERS)
  })
})
