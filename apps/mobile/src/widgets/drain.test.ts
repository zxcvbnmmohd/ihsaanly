import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'

import type { WidgetTap } from './model'

interface Fake {
  taps: unknown[]
  forgotten: number[]
  failForget: boolean
}
const fake: Fake = { taps: [], forgotten: [], failForget: false }

mock.module('./taps', () => ({
  readWidgetTaps: async (): Promise<unknown[]> => fake.taps,
  onWidgetTap: (): (() => void) => () => {},
  forgetWidgetTaps: async (through: number): Promise<void> => {
    if (fake.failForget) throw new Error('disk full')
    fake.forgotten.push(through)
  },
}))

const { pendingTaps, tapKind, takeWidgetTaps, waitingTaps } = await import('./drain')
const { wipe } = await import('@ihsaanly/state/storage/backend')
const { allActions, reloadEvents } = await import('@ihsaanly/state/storage/events')
const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')
const { setPlace } = await import('@ihsaanly/state/location/store')
const { getUserState, setUserState } = await import('@ihsaanly/state/plan/user-state-store')
const { markPrayer } = await import('@ihsaanly/state/prayer/marks')
const { startProgress } = await import('@ihsaanly/state/progress/configure')
const { addCount, currentPeriod, getItemProgress } = await import('@ihsaanly/state/progress/store')
const { forgetRemoteMarks, getRemoteMarks } = await import('@/remote-marks/ledger')

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
// 13:30 in London: Dhuhr's window, which opened at about 12:53.
const afterDhuhr = new Date('2026-09-23T12:30:00Z').getTime()
// 17:00 in London: Asr's window, a new occasion for the tasbih.
const atAsr = new Date('2026-09-23T16:00:00Z').getTime()

const tasbih = 'tasbih-after-prayer'
const counts = (from: number, n: number): WidgetTap[] =>
  Array.from({ length: n }, (_, index) => ({ kind: 'count', id: tasbih, at: from + index * 1000 }))

let stopProgress: () => void = () => {}

beforeEach(() => {
  wipe()
  reloadPreferences()
  reloadEvents()
  fake.taps = []
  fake.forgotten = []
  fake.failForget = false
  setPlace(london)
  setSystemTime(new Date(afterDhuhr + 60_000))
  stopProgress = startProgress()
  forgetRemoteMarks()
})
afterEach(() => stopProgress())
afterAll(() => setSystemTime())

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
      { kind: 'wave', id: 'd', at: 50 },
    ]
    expect(pendingTaps(taps, 10)).toEqual([
      { id: 'a', at: 20 },
      { id: 'b', at: 30 },
    ])
  })

  it('keeps taps of different kinds made at the same moment apart', () => {
    const taps: unknown[] = [
      { kind: 'count', id: 'a', at: 20 },
      { kind: 'count', id: 'a', at: 20 },
      { kind: 'done', id: 'a', at: 20 },
      { id: 'a', at: 20 },
    ]
    expect(pendingTaps(taps, 0)).toEqual([
      { kind: 'count', id: 'a', at: 20 },
      { kind: 'done', id: 'a', at: 20 },
    ])
  })

  it('reads a tap written before kinds existed as done', () => {
    expect(tapKind({ id: 'a', at: 1 })).toBe('done')
    expect(tapKind({ kind: 'prayer', id: 'fajr', at: 1 })).toBe('prayer')
  })
})

describe('takeWidgetTaps, done', () => {
  it('files each tap as a completion at its own moment, under its own day', async () => {
    fake.taps = [
      { id: 'morning-adhkar', at: morning },
      { kind: 'done', id: 'morning-adhkar', at: morning },
      { kind: 'done', id: 'witr', at: pastMidnight },
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
    // Noted, for the toast that says so and can take them back.
    expect(getRemoteMarks()).toEqual([
      {
        source: 'widget',
        kind: 'done',
        id: 'morning-adhkar',
        at: morning,
        timeZone: 'Europe/London',
      },
      { source: 'widget', kind: 'done', id: 'witr', at: pastMidnight, timeZone: 'Europe/London' },
    ])
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
    const taken = await Promise.all([takeWidgetTaps(), takeWidgetTaps()])
    expect(taken.sort()).toEqual([0, 1])
    expect(allActions()).toHaveLength(1)
  })

  it('lets go of what it filed where taps are kept apart (Android)', async () => {
    fake.taps = [
      { id: 'morning-adhkar', at: morning },
      { kind: 'prayer', id: 'dhuhr', at: afterDhuhr },
    ]
    await takeWidgetTaps()
    expect(fake.forgotten).toEqual([afterDhuhr])
    await takeWidgetTaps()
    expect(fake.forgotten).toEqual([afterDhuhr])
  })

  it('still counts what it filed when the kept taps cannot be let go of', async () => {
    fake.failForget = true
    fake.taps = [{ id: 'morning-adhkar', at: morning }]
    expect(await takeWidgetTaps()).toBe(1)
    expect(await waitingTaps()).toEqual([])
  })

  it('files without a saved place, under UTC and without a window', async () => {
    setPlace(null)
    fake.taps = [{ id: 'morning-adhkar', at: morning }]
    expect(await takeWidgetTaps()).toBe(1)
    expect(allActions()[0]?.deltaSeconds).toBeNull()
  })
})

describe('takeWidgetTaps, prayer', () => {
  it('marks the prayer at the tap, against its own window, as Today does', async () => {
    fake.taps = [{ kind: 'prayer', id: 'dhuhr', at: afterDhuhr }] satisfies WidgetTap[]
    expect(await takeWidgetTaps()).toBe(1)
    const [action] = allActions()
    expect(action?.kind).toBe('prayer-performed')
    expect(action?.subject).toBe('dhuhr')
    expect(action?.at).toBe(afterDhuhr)
    expect(action?.logDay).toBe('2026-09-23')
    expect(action?.deltaSeconds).toBeNumber()
    expect(getRemoteMarks()).toEqual([
      { source: 'widget', kind: 'prayer', id: 'dhuhr', at: afterDhuhr, timeZone: 'Europe/London' },
    ])
  })

  it('leaves a prayer already marked that day alone', async () => {
    markPrayer('dhuhr', new Date(afterDhuhr - 60_000), london.timeZone)
    fake.taps = [{ kind: 'prayer', id: 'dhuhr', at: afterDhuhr }]
    expect(await takeWidgetTaps()).toBe(0)
    expect(allActions()).toHaveLength(1)
  })

  it('files nothing while tracking is paused, and still moves past the tap', async () => {
    setUserState({ ...getUserState(), trackingPaused: true })
    fake.taps = [{ kind: 'prayer', id: 'dhuhr', at: afterDhuhr }]
    expect(await takeWidgetTaps()).toBe(0)
    expect(allActions()).toEqual([])
    expect(await waitingTaps()).toEqual([])
  })

  it('skips what is not a prayer', async () => {
    fake.taps = [{ kind: 'prayer', id: 'sunrise', at: afterDhuhr }]
    expect(await takeWidgetTaps()).toBe(0)
    expect(allActions()).toEqual([])
  })
})

describe('takeWidgetTaps, count', () => {
  it('counts toward the item while its occasion is still open', async () => {
    fake.taps = counts(afterDhuhr, 3)
    expect(await takeWidgetTaps()).toBe(3)
    expect(getItemProgress(tasbih).count).toBe(3)
    expect(allActions()).toEqual([])
    expect(getRemoteMarks()).toEqual([
      {
        source: 'widget',
        kind: 'count',
        id: tasbih,
        at: afterDhuhr + 2000,
        timeZone: 'Europe/London',
        counted: 3,
        periodKey: currentPeriod(tasbih),
      },
    ])
  })

  it('files the item done at the tap that reaches its repeat, and starts its count again', async () => {
    addCount(tasbih, 31)
    fake.taps = counts(afterDhuhr, 3)
    expect(await takeWidgetTaps()).toBe(3)
    const [action] = allActions()
    expect(action?.kind).toBe('item-completed')
    expect(action?.subject).toBe(tasbih)
    expect(action?.at).toBe(afterDhuhr + 1000)
    expect(getItemProgress(tasbih).count).toBe(0)
    expect(getRemoteMarks().map((mark) => [mark.kind, mark.at])).toEqual([
      ['done', afterDhuhr + 1000],
    ])
  })

  it('still files a finished count once its occasion has passed, and drops an unfinished one', async () => {
    setSystemTime(new Date(atAsr))
    fake.taps = counts(afterDhuhr, 33)
    expect(await takeWidgetTaps()).toBe(33)
    expect(allActions().map((action) => action.at)).toEqual([afterDhuhr + 32_000])

    fake.taps = [...fake.taps, ...counts(afterDhuhr + 40_000, 3)]
    expect(await takeWidgetTaps()).toBe(3)
    expect(allActions()).toHaveLength(1)
    expect(getItemProgress(tasbih).count).toBe(0)
  })

  it('counts what the app had counted in the passed occasion too', async () => {
    addCount(tasbih, 30)
    setSystemTime(new Date(atAsr))
    fake.taps = counts(afterDhuhr, 3)
    expect(await takeWidgetTaps()).toBe(3)
    expect(allActions().map((action) => action.at)).toEqual([afterDhuhr + 2000])
  })

  it('skips an item that is not counted, or not known', async () => {
    fake.taps = [
      { kind: 'count', id: 'morning-adhkar', at: afterDhuhr },
      { kind: 'count', id: 'no-such-item', at: afterDhuhr + 1 },
    ]
    expect(await takeWidgetTaps()).toBe(0)
    expect(allActions()).toEqual([])
  })
})
