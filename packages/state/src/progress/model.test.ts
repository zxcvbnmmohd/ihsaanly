import { describe, expect, it } from 'bun:test'
import type { Trigger } from '@ihsaanly/core/content/schema'
import {
  dayOf,
  isFinished,
  mergeProgress,
  normalize,
  parseProgress,
  periodKeyFor,
  progressKey,
} from './model'

const DAY = '2026-10-03'

describe('periodKeyFor', () => {
  it('keys window items by their window, and prayer items by their prayer', () => {
    expect(periodKeyFor({ kind: 'window', window: 'morning' }, DAY)).toBe(`${DAY}:morning`)
    expect(periodKeyFor({ kind: 'window', window: 'evening', day: 'friday' }, DAY)).toBe(
      `${DAY}:evening`,
    )
    expect(periodKeyFor({ kind: 'prayer', prayer: 'fajr', when: 'after' }, DAY, 'dhuhr')).toBe(
      `${DAY}:fajr`,
    )
    expect(periodKeyFor({ kind: 'prayer', prayer: 'jumuah', when: 'before' }, DAY)).toBe(
      `${DAY}:jumuah`,
    )
  })

  it('keys after-every-prayer items by the window they are done in, or the day outside one', () => {
    const any: Trigger = { kind: 'prayer', prayer: 'any', when: 'after' }
    expect(periodKeyFor(any, DAY, 'asr')).toBe(`${DAY}:asr`)
    expect(periodKeyFor(any, DAY, 'maghrib')).toBe(`${DAY}:maghrib`)
    expect(periodKeyFor(any, DAY)).toBe(`${DAY}:day`)
  })

  it('keys day items by the day and event items by the event', () => {
    expect(periodKeyFor({ kind: 'day', day: 'monday' }, DAY)).toBe(`${DAY}:day`)
    expect(periodKeyFor({ kind: 'event', event: 'eating' }, DAY)).toBe(`${DAY}:eating`)
  })

  it('reads the day back out', () => {
    expect(dayOf(`${DAY}:morning`)).toBe(DAY)
    expect(dayOf(DAY)).toBe(DAY)
  })
})

describe('mergeProgress', () => {
  const value = (
    count: number,
    parts: string[],
    updatedAt: number,
    periodKey = `${DAY}:morning`,
  ): string => JSON.stringify({ periodKey, count, parts, updatedAt })

  it('keeps the higher count and every part, in one order whichever side merges', () => {
    const a = value(5, ['b', 'a'], 10)
    const b = value(3, ['c', 'a'], 12)
    const merged = value(5, ['a', 'b', 'c'], 12)
    expect(mergeProgress(a, b)).toBe(merged)
    expect(mergeProgress(b, a)).toBe(merged)
    expect(mergeProgress(merged, merged)).toBe(merged)
  })

  it('leaves different periods and unreadable values to newest-wins', () => {
    expect(mergeProgress(value(1, [], 1), value(2, [], 2, `${DAY}:evening`))).toBeNull()
    expect(mergeProgress('{"oops', value(2, [], 2))).toBeNull()
    expect(mergeProgress(value(2, [], 2), '{"count":"x"}')).toBeNull()
  })
})

describe('the stored shape', () => {
  it('normalises parts and reads back', () => {
    const stored = normalize({ periodKey: 'p', count: 1, parts: ['b', 'a', 'b'], updatedAt: 3 })
    expect(stored.parts).toEqual(['a', 'b'])
    expect(parseProgress(JSON.stringify(stored))).toEqual(stored)
    expect(parseProgress('null')).toBeNull()
    expect(progressKey('tasbih')).toBe('progress:tasbih')
  })
})

describe('isFinished', () => {
  it('needs the repeat count for an item without parts', () => {
    expect(isFinished({ count: 32, parts: [] }, { repeat: 33 })).toBe(false)
    expect(isFinished({ count: 33, parts: [] }, { repeat: 33 })).toBe(true)
    expect(isFinished({ count: 1, parts: [] }, { repeat: 1, parts: [] })).toBe(true)
  })

  it('needs every part for an item with parts, whatever the count', () => {
    const target = { repeat: 1, parts: [{ id: 'a' }, { id: 'b' }] }
    expect(isFinished({ count: 9, parts: ['a'] }, target)).toBe(false)
    expect(isFinished({ count: 0, parts: ['a', 'b'] }, target)).toBe(true)
  })
})
