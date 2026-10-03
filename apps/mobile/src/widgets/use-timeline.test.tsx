import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { items } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { dayContextFor } from '@ihsaanly/core/plan/day-context'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '@ihsaanly/core/prayer/calculation'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { renderHook } from '@testing-library/react'

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

beforeEach(() => {
  published = spyOn(publish, 'publishTimeline').mockResolvedValue()
})
afterEach(() => published.mockRestore())

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
})
