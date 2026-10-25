import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'

import type { WidgetTap } from './model'

interface Fake {
  taps: unknown[]
}
const fake: Fake = { taps: [] }

mock.module('./taps', () => ({
  readWidgetTaps: async (): Promise<unknown[]> => fake.taps,
  onWidgetTap: (): (() => void) => () => {},
}))

const { pendingTaps, takeWidgetTaps, waitingTaps } = await import('./drain')
const { wipe } = await import('@ihsaanly/state/storage/backend')
const { allActions, reloadEvents } = await import('@ihsaanly/state/storage/events')
const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')
const { setPlace } = await import('@ihsaanly/state/location/store')

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

// 09:30 in London: the sunrise window, filed under 23 September.
const morning = new Date('2026-09-23T08:30:00Z').getTime()
// 00:30 in London on the 24th, still 23:30 UTC on the 23rd.
const pastMidnight = new Date('2026-09-23T23:30:00Z').getTime()

beforeEach(() => {
  wipe()
  reloadPreferences()
  reloadEvents()
  fake.taps = []
  setPlace(london)
})

describe('pendingTaps', () => {
  it('drops what is malformed or already taken, and keeps each tap once, oldest first', () => {
    const taps: unknown[] = [
      { id: 'b', at: 30 },
      { id: 'a', at: 20 },
      { id: 'b', at: 30 },
      { id: 'old', at: 10 },
      { id: 'a' },
      { id: 4, at: 40 },
      null,
      'tap',
      { id: 'c', at: Number.NaN },
    ]
    expect(pendingTaps(taps, 10)).toEqual([
      { id: 'a', at: 20 },
      { id: 'b', at: 30 },
    ])
  })
})

describe('takeWidgetTaps', () => {
  it('files each tap as a completion at its own moment, under its own day', async () => {
    fake.taps = [
      { id: 'morning-adhkar', at: morning },
      { id: 'morning-adhkar', at: morning },
      { id: 'witr', at: pastMidnight },
    ] satisfies WidgetTap[]
    expect(await takeWidgetTaps()).toBe(2)
    const actions = allActions()
    expect(actions.map((action) => [action.subject, action.at, action.logDay])).toEqual([
      ['morning-adhkar', morning, '2026-09-23'],
      ['witr', pastMidnight, '2026-09-24'],
    ])
    expect(actions.every((action) => action.kind === 'item-completed')).toBe(true)
    // Filed with its window, as a tap in the app is.
    expect(actions[0]?.deltaSeconds).toBeNumber()
  })

  it('never files the same tap twice, however often it is read', async () => {
    fake.taps = [{ id: 'morning-adhkar', at: morning }]
    expect(await takeWidgetTaps()).toBe(1)
    expect(await takeWidgetTaps()).toBe(0)
    expect(await waitingTaps()).toEqual([])
    fake.taps = [...fake.taps, { id: 'witr', at: morning + 1 }]
    expect(await waitingTaps()).toEqual([{ id: 'witr', at: morning + 1 }])
    expect(await takeWidgetTaps()).toBe(1)
    expect(allActions()).toHaveLength(2)
  })

  it('skips an id the content does not know, and still moves past it', async () => {
    fake.taps = [{ id: 'no-such-item', at: morning }]
    expect(await takeWidgetTaps()).toBe(0)
    expect(allActions()).toEqual([])
    expect(await waitingTaps()).toEqual([])
  })

  it('files two overlapping calls once', async () => {
    fake.taps = [{ id: 'morning-adhkar', at: morning }]
    const counts = await Promise.all([takeWidgetTaps(), takeWidgetTaps()])
    expect(counts.sort()).toEqual([0, 1])
    expect(allActions()).toHaveLength(1)
  })
})
