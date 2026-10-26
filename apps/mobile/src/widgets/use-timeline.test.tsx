import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { items } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '@ihsaanly/core/prayer/calculation'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { deleteOwnDua, saveOwnDua, togglePinned } from '@ihsaanly/state/my-duas/store'
import * as progress from '@ihsaanly/state/progress/store'
import { setAccent } from '@ihsaanly/state/theme/accent-store'
import { act, renderHook } from '@testing-library/react'
import { AppState } from 'react-native'

import * as drain from './drain'
import * as model from './model'
import * as publish from './publish'
import { useWidgetTimeline } from './use-timeline'

const london: Place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}
const now = new Date('2026-09-23T08:30:00Z')

function signals(overrides: Partial<Signals> = {}): Signals {
  return {
    now,
    timeZone: london.timeZone,
    items,
    prayerTimes: prayerTimesAcross(london, now, DEFAULT_CALCULATION_PREFERENCES, 3),
    today: dayContextFor(now, london.timeZone, 0, 0, null),
    upcoming: [],
    prayedToday: {},
    completedToday: {},
    activeEvents: [],
    userState: DEFAULT_USER_STATE,
    attendsJumuah: true,
    preferences: {
      enabledItemIds: [],
      knownItemIds: [],
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
    ...overrides,
  }
}

function planned(itemId: string | null): Plan {
  return {
    today: { rightNow: itemId ? { itemId } : null, window: null },
    notifications: [],
  } as never
}

let published: ReturnType<typeof spyOn>
let taken: ReturnType<typeof spyOn>
let appState: ReturnType<typeof spyOn>
let listeners: ((state: string) => void)[] = []

beforeEach(() => {
  published = spyOn(publish, 'publishTimeline').mockResolvedValue()
  taken = spyOn(drain, 'takeWidgetTaps').mockResolvedValue(0)
  listeners = []
  appState = spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (state: string) => void,
  ) => {
    listeners.push(listener)
    return { remove: () => {} }
  }) as never)
})
afterEach(() => {
  published.mockRestore()
  taken.mockRestore()
  appState.mockRestore()
})

describe('useWidgetTimeline', () => {
  it('publishes nothing until there are signals', () => {
    renderHook(() => useWidgetTimeline(null, null, 'London'))
    expect(published).not.toHaveBeenCalled()
  })

  it('publishes the whole day, ending in a stale entry', () => {
    renderHook(() => useWidgetTimeline(signals(), planned(null), 'London'))
    expect(published).toHaveBeenCalledTimes(1)
    const timeline = published.mock.calls[0]?.[0] as {
      at: number
      stale: boolean
      date: { place: string }
    }[]
    expect(timeline.length).toBeGreaterThan(40)
    expect(timeline[0]?.at).toBe(now.getTime())
    expect(timeline[0]?.date.place).toBe('London')
    expect(timeline.at(-1)?.stale).toBe(true)
  })

  it('does not republish when only the plan object is rebuilt', () => {
    const view = renderHook(({ plan }) => useWidgetTimeline(signals(), plan, 'London'), {
      initialProps: { plan: planned(null) },
    })
    view.rerender({ plan: planned(null) })
    expect(published).toHaveBeenCalledTimes(1)
  })

  it('republishes when something the widgets show changes', () => {
    const view = renderHook(({ label, plan }) => useWidgetTimeline(signals(), plan, label), {
      initialProps: { label: 'London', plan: planned(null) },
    })
    view.rerender({ label: 'Paris', plan: planned(null) })
    expect(published).toHaveBeenCalledTimes(2)
    view.rerender({ label: 'Paris', plan: planned('some-item') })
    expect(published).toHaveBeenCalledTimes(3)
  })

  it('republishes in the new colours when the accent changes', () => {
    renderHook(() => useWidgetTimeline(signals(), planned(null), 'London'))
    expect(published).toHaveBeenCalledTimes(1)
    act(() => setAccent('plum'))
    expect(published).toHaveBeenCalledTimes(2)
    const [timeline] = published.mock.calls.at(-1) as [{ ink: { light: { accent: string } } }[]]
    expect(timeline[0]?.ink.light.accent).toBe('#7d3f73')
    act(() => setAccent('terracotta'))
  })

  it('republishes when a prayer is marked or tracking is paused', () => {
    const view = renderHook(({ s }) => useWidgetTimeline(s, planned(null), 'London'), {
      initialProps: { s: signals() },
    })
    view.rerender({ s: signals({ prayedToday: { fajr: now } }) })
    expect(published).toHaveBeenCalledTimes(2)
    view.rerender({
      s: signals({
        prayedToday: { fajr: now },
        userState: { ...DEFAULT_USER_STATE, trackingPaused: true },
      }),
    })
    expect(published).toHaveBeenCalledTimes(3)
  })

  it('never breaks Today when the widgets cannot be updated', async () => {
    published.mockRejectedValue(new Error('no widgets here'))
    expect(() =>
      renderHook(() => useWidgetTimeline(signals(), planned(null), 'London')),
    ).not.toThrow()
    await Promise.resolve()
  })

  it('never breaks Today when the timeline cannot be built', () => {
    const broken = signals({ prayerTimes: null as never })
    expect(() => renderHook(() => useWidgetTimeline(broken, planned(null), 'London'))).not.toThrow()
    expect(published).not.toHaveBeenCalled()
  })

  it('republishes when an item is marked done', () => {
    const view = renderHook(({ s }) => useWidgetTimeline(s, planned(null), 'London'), {
      initialProps: { s: signals() },
    })
    view.rerender({ s: signals({ completedToday: { 'morning-adhkar': now } }) })
    expect(published).toHaveBeenCalledTimes(2)
  })

  it('republishes the Quick duas when a dua is pinned or written', () => {
    renderHook(() => useWidgetTimeline(signals(), planned(null), 'London'))
    try {
      act(() => togglePinned('evening-adhkar'))
      expect(published).toHaveBeenCalledTimes(2)
      act(() => {
        saveOwnDua({
          id: 'mine-widget',
          title: 'Mine',
          arabic: null,
          transliteration: null,
          text: 'Words',
          repeat: 1,
          moment: null,
        })
      })
      expect(published).toHaveBeenCalledTimes(3)
      const timeline = published.mock.calls[2]?.[0] as { quickDuas: { url: string }[] }[]
      expect(timeline[0]?.quickDuas.map((link) => link.url)).toEqual([
        'ihsaanly://item/read/evening-adhkar',
        'ihsaanly://item/mine-widget',
      ])
    } finally {
      act(() => {
        togglePinned('evening-adhkar')
        deleteOwnDua('mine-widget')
      })
    }
  })

  it('takes in widget taps on launch and on every return to the foreground', () => {
    renderHook(() => useWidgetTimeline(signals(), planned(null), 'London'))
    expect(taken).toHaveBeenCalledTimes(1)
    listeners.forEach((listener) => listener('background'))
    expect(taken).toHaveBeenCalledTimes(1)
    listeners.forEach((listener) => listener('active'))
    expect(taken).toHaveBeenCalledTimes(2)
  })

  it('hands the widgets what counted items have counted, for +1 to count on top of', () => {
    const read = spyOn(progress, 'getItemProgress').mockImplementation((id: string) => ({
      count: id === 'tasbih-after-prayer' ? 7 : 0,
      parts: [],
    }))
    const built = spyOn(model, 'widgetTimeline')
    try {
      renderHook(() => useWidgetTimeline(signals(), planned(null), 'London'))
      expect(built.mock.calls[0]?.[0].counts).toEqual({ 'tasbih-after-prayer': 7 })
    } finally {
      read.mockRestore()
      built.mockRestore()
    }
  })

  it('never breaks Today when the widget taps cannot be read', async () => {
    taken.mockRejectedValue(new Error('no app group'))
    expect(() =>
      renderHook(() => useWidgetTimeline(signals(), planned(null), 'London')),
    ).not.toThrow()
    await Promise.resolve()
  })
})
