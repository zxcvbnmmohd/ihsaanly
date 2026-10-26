import { afterAll, afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace } from '@ihsaanly/state/location/store'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { markPrayer } from '@ihsaanly/state/prayer/marks'
import { startProgress } from '@ihsaanly/state/progress/configure'
import { addCount, currentPeriod, getItemProgress } from '@ihsaanly/state/progress/store'
import { wipe } from '@ihsaanly/state/storage/backend'
import { prayerMarksOn, reloadEvents, useCompletedOn } from '@ihsaanly/state/storage/events'
import { reloadPreferences } from '@ihsaanly/state/storage/preference-store'
import { renderHook } from '@testing-library/react'

import {
  forgetRemoteMarks,
  getRemoteMarks,
  noteRemoteMarks,
  type RemoteMark,
  undoRemoteMarks,
  useRemoteMarks,
} from './ledger'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}
const zone = london.timeZone
// 13:30 in London on 23 September.
const now = new Date('2026-09-23T12:30:00Z').getTime()
// 00:30 in London on the 24th: filed under the 24th, though it is the 23rd in UTC.
const pastMidnight = new Date('2026-09-23T23:30:00Z').getTime()
const tasbih = 'tasbih-after-prayer'

let stopProgress: () => void = () => {}

beforeEach(() => {
  wipe()
  reloadPreferences()
  reloadEvents()
  setPlace(london)
  setSystemTime(new Date(now + 60_000))
  stopProgress = startProgress()
})
afterEach(() => stopProgress())
afterAll(() => setSystemTime())

function completedOn(day: string): string[] {
  return Object.keys(renderHook(() => useCompletedOn(day)).result.current)
}

describe('the remote marks ledger', () => {
  it('notes marks in order, ignores an empty note, and keeps only the latest fifty', () => {
    noteRemoteMarks([])
    expect(getRemoteMarks()).toEqual([])
    const many: RemoteMark[] = Array.from({ length: 55 }, (_, index) => ({
      source: 'widget',
      kind: 'done',
      id: 'dhikr-morning',
      at: now + index,
      timeZone: zone,
    }))
    noteRemoteMarks(many)
    expect(getRemoteMarks()).toHaveLength(50)
    expect(getRemoteMarks()[0]?.at).toBe(now + 5)
    const { result } = renderHook(() => useRemoteMarks())
    expect(result.current).toHaveLength(50)
  })

  it('forgets the marks given, or all of them', () => {
    const first: RemoteMark = { source: 'widget', kind: 'done', id: 'a', at: 1, timeZone: zone }
    const second: RemoteMark = { ...first, id: 'b', at: 2 }
    noteRemoteMarks([first, second])
    forgetRemoteMarks([getRemoteMarks()[0] as RemoteMark])
    expect(getRemoteMarks().map((mark) => mark.id)).toEqual(['b'])
    forgetRemoteMarks()
    expect(getRemoteMarks()).toEqual([])
  })

  it('undoes a completion and a prayer on the day each was filed, and forgets them', () => {
    completeItem('dhikr-morning', new Date(pastMidnight), zone)
    markPrayer('fajr', new Date(now), zone)
    noteRemoteMarks([
      { source: 'widget', kind: 'done', id: 'dhikr-morning', at: pastMidnight, timeZone: zone },
      { source: 'notification', kind: 'prayer', id: 'fajr', at: now, timeZone: zone },
      { source: 'widget', kind: 'prayer', id: 'not-a-prayer', at: now, timeZone: zone },
    ])
    expect(completedOn('2026-09-24')).toEqual(['dhikr-morning'])
    expect(prayerMarksOn('2026-09-23').fajr).toBeDefined()

    undoRemoteMarks(getRemoteMarks())
    expect(completedOn('2026-09-24')).toEqual([])
    expect(prayerMarksOn('2026-09-23').fajr).toBeUndefined()
    expect(getRemoteMarks()).toEqual([])
  })

  it('takes counts back while their period is current, and leaves a past period alone', () => {
    addCount(tasbih, 5)
    const periodKey = currentPeriod(tasbih)
    const counted: RemoteMark = {
      source: 'widget',
      kind: 'count',
      id: tasbih,
      at: now,
      timeZone: zone,
      counted: 3,
      periodKey,
    }
    undoRemoteMarks([counted])
    expect(getItemProgress(tasbih).count).toBe(2)
    undoRemoteMarks([
      { ...counted, periodKey: 'gone' },
      { ...counted, counted: undefined },
    ])
    expect(getItemProgress(tasbih).count).toBe(2)
  })
})
