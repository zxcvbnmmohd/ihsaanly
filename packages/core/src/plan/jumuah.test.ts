import { describe, expect, it } from 'bun:test'

import { en } from '../strings/en'

import {
  attendsJumuah,
  isJumuahAt,
  isJumuahDay,
  prayerName,
  prayerNames,
  resolveTriggerPrayer,
  windowName,
} from './jumuah'

describe('attendsJumuah', () => {
  it('lets an explicit choice win over travel and gender', () => {
    expect(attendsJumuah('attend', true, 'female')).toBe(true)
    expect(attendsJumuah('dhuhr', false, 'male')).toBe(false)
  })

  it('on auto, attends unless travelling or a sister', () => {
    expect(attendsJumuah('auto', false, 'male')).toBe(true)
    expect(attendsJumuah('auto', false, 'unspecified')).toBe(true)
    expect(attendsJumuah('auto', true, 'male')).toBe(false)
    expect(attendsJumuah('auto', false, 'female')).toBe(false)
  })

  it('throws on a choice it does not know', () => {
    expect(() => attendsJumuah('sometimes' as never, false, 'male')).toThrow('Unhandled case')
  })
})

describe('isJumuahDay', () => {
  it('is true only on Friday (5) for someone who attends', () => {
    expect(isJumuahDay({ weekday: 5 }, true)).toBe(true)
    expect(isJumuahDay({ weekday: 5 }, false)).toBe(false)
    expect(isJumuahDay({ weekday: 4 }, true)).toBe(false)
    expect(isJumuahDay({ weekday: 6 }, true)).toBe(false)
  })
})

describe('isJumuahAt', () => {
  it('reads the weekday in the given zone, not UTC', () => {
    // Friday 2026-09-18 00:30 in Auckland (+12) is still Thursday 12:30 UTC.
    const instant = new Date('2026-09-17T12:30:00Z')
    expect(isJumuahAt(instant, 'Pacific/Auckland', true)).toBe(true)
    expect(isJumuahAt(instant, 'UTC', true)).toBe(false)
  })

  it('is false on a Friday for someone who does not attend', () => {
    expect(isJumuahAt(new Date('2026-09-18T12:00:00Z'), 'UTC', false)).toBe(false)
  })
})

describe('resolveTriggerPrayer', () => {
  it('lets a jumuah trigger stand in for dhuhr on Jumu’ah and be absent otherwise', () => {
    expect(resolveTriggerPrayer('jumuah', true)).toBe('dhuhr')
    expect(resolveTriggerPrayer('jumuah', false)).toBeNull()
  })

  it('steps a dhuhr trigger aside on Jumu’ah', () => {
    expect(resolveTriggerPrayer('dhuhr', true)).toBeNull()
    expect(resolveTriggerPrayer('dhuhr', false)).toBe('dhuhr')
  })

  it('leaves every other prayer, and any, alone', () => {
    expect(resolveTriggerPrayer('asr', true)).toBe('asr')
    expect(resolveTriggerPrayer('any', true)).toBe('any')
    expect(resolveTriggerPrayer('fajr', false)).toBe('fajr')
  })
})

describe('names', () => {
  it('names Dhuhr as Jumu’ah only on the day', () => {
    expect(prayerName(en, 'dhuhr', true)).toBe(en.prayer.jumuah)
    expect(prayerName(en, 'dhuhr', false)).toBe(en.prayer.dhuhr)
    expect(prayerName(en, 'asr', true)).toBe(en.prayer.asr)
  })

  it('gives all five names with only dhuhr swapped', () => {
    expect(prayerNames(en, false)).toEqual({
      fajr: en.prayer.fajr,
      dhuhr: en.prayer.dhuhr,
      asr: en.prayer.asr,
      maghrib: en.prayer.maghrib,
      isha: en.prayer.isha,
    })
    expect(prayerNames(en, true).dhuhr).toBe(en.prayer.jumuah)
    expect(prayerNames(en, true).fajr).toBe(en.prayer.fajr)
  })

  it('names the dhuhr window as After Jumu’ah only on the day', () => {
    expect(windowName(en, 'dhuhr', true)).toBe(en.window.jumuah)
    expect(windowName(en, 'dhuhr', false)).toBe(en.window.dhuhr)
    expect(windowName(en, 'asr', true)).toBe(en.window.asr)
  })
})
