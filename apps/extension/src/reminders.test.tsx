import { beforeEach, describe, expect, it } from 'bun:test'
import { items } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import type { ItemNotification, Plan, ScheduledNotification } from '@ihsaanly/core/plan/signals'
import { PRAYERS } from '@ihsaanly/core/prayer/qada'
import { en } from '@ihsaanly/core/strings/en'
import { useCompletedToday } from '@ihsaanly/state/plan/completions'
import { getCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { renderHook, waitFor } from '@testing-library/react'
import { fakeChrome } from '../test/chrome'
import { resetApp, settle } from '../test/route'
import { BADGE_ALARM, BADGE_KEY, DONE_QUEUE_KEY, type QueuedDone, type Reminder } from './alarms'
import { useBadge, useQueuedDones, useReminderSync } from './reminders'

beforeEach(resetApp)

const makkah: Place = {
  label: 'Makkah',
  latitude: 21.4225,
  longitude: 39.8262,
  timeZone: 'Asia/Riyadh',
  source: 'city',
}

const item = items[0]
if (!item) throw new Error('the content has no items')

/** A plan with only what the hook reads: the scheduled notifications. */
function planWith(notifications: ScheduledNotification[]): Plan {
  return { notifications } as unknown as Plan
}

function itemEntry(at: number): ItemNotification {
  return {
    kind: 'item',
    itemId: item?.id ?? '',
    at: new Date(at),
    reason: 'current-window',
    window: null,
  }
}

const soon = Date.now() + 3_600_000

describe('useReminderSync', () => {
  it('turns the plan into alarms and the words to show with them', async () => {
    renderHook(() => useReminderSync(planWith([itemEntry(soon)])))

    await waitFor(() => expect(fakeChrome.alarmList.size).toBe(1))
    const [alarm] = [...fakeChrome.alarmList.values()]
    expect(alarm?.name).toStartWith('plan:')
    expect(alarm?.scheduledTime).toBe(soon)
    const stored = fakeChrome.local.data.get(alarm?.name ?? '') as Reminder
    expect(stored).toMatchObject({
      itemId: item?.id,
      endsAt: soon,
      actions: en.notifications.action,
    })
    expect(stored.body).not.toBe('')
  })

  it('skips entries for items it does not know', async () => {
    const unknown: ItemNotification = { ...itemEntry(soon), itemId: 'no-such-item' }
    renderHook(() => useReminderSync(planWith([unknown, itemEntry(soon)])))
    await waitFor(() => expect(fakeChrome.alarmList.size).toBe(1))
  })

  it('does nothing without a plan', async () => {
    renderHook(() => useReminderSync(null))
    await Bun.sleep(5)
    expect(fakeChrome.alarmList.size).toBe(0)
  })

  it('syncs again only when the schedule itself changes, not the plan object', async () => {
    const { rerender } = renderHook(({ plan }) => useReminderSync(plan), {
      initialProps: { plan: planWith([itemEntry(soon)]) },
    })
    await waitFor(() => expect(fakeChrome.alarmList.size).toBe(1))

    // A rebuilt plan with the same entries: the alarm removed by hand stays removed.
    fakeChrome.alarmList.clear()
    rerender({ plan: planWith([itemEntry(soon)]) })
    await Bun.sleep(5)
    expect(fakeChrome.alarmList.size).toBe(0)

    rerender({ plan: planWith([itemEntry(soon + 60_000)]) })
    await waitFor(() => expect(fakeChrome.alarmList.size).toBe(1))
  })
})

describe('useBadge', () => {
  it('blanks the badge until there is a place', () => {
    renderHook(() => useBadge(null, getCalculationPreferences(), en))
    expect(fakeChrome.badgeText).toEqual([''])
    expect(fakeChrome.alarmList.size).toBe(0)
  })

  it('hands the worker five prayers a day, in order, and a minute alarm to count down with', async () => {
    renderHook(() => useBadge(makkah, getCalculationPreferences(), en))

    const prayers = fakeChrome.local.data.get(BADGE_KEY) as { name: string; at: number }[]
    expect(prayers).toHaveLength(20)
    expect(prayers.map((prayer) => prayer.at)).toEqual(
      [...prayers.map((prayer) => prayer.at)].sort((a, b) => a - b),
    )
    expect(new Set(prayers.map((prayer) => prayer.name))).toEqual(
      new Set(PRAYERS.map((prayer) => en.prayer[prayer])),
    )
    expect(fakeChrome.alarmList.get(BADGE_ALARM)?.periodInMinutes).toBe(1)
    expect(fakeChrome.badgeText).toHaveLength(1)
    expect(fakeChrome.badgeText[0]).toMatch(/^\d+[mh]$/)
  })

  it('refreshes when the place changes, but not when only object identities do', () => {
    const { rerender } = renderHook(
      ({ place }) => useBadge(place, getCalculationPreferences(), en),
      {
        initialProps: { place: makkah as Place | null },
      },
    )
    rerender({ place: { ...makkah } })
    expect(fakeChrome.badgeText).toHaveLength(1)

    rerender({ place: { ...makkah, latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London' } })
    expect(fakeChrome.badgeText).toHaveLength(2)

    rerender({ place: null })
    expect(fakeChrome.badgeText.at(-1)).toBe('')
  })
})

describe('useQueuedDones', () => {
  const done = (itemId: string, at: number): QueuedDone => ({ itemId, at })

  it('records each Done pressed on a notification and empties the queue', async () => {
    const at = Date.now()
    await fakeChrome.local.set({ [DONE_QUEUE_KEY]: [done(item?.id ?? '', at)] })
    const { result } = renderHook(() => {
      useQueuedDones('Asia/Riyadh')
      return useCompletedToday('Asia/Riyadh', new Date(at))
    })

    await waitFor(() => expect(result.current[item?.id ?? '']).toBeDefined())
    expect(fakeChrome.local.data.has(DONE_QUEUE_KEY)).toBe(false)
  })

  it('leaves an empty queue alone', async () => {
    await fakeChrome.local.set({ [DONE_QUEUE_KEY]: [] })
    renderHook(() => useQueuedDones('Asia/Riyadh'))
    await settle(() => Bun.sleep(5))
    expect(fakeChrome.local.data.has(DONE_QUEUE_KEY)).toBe(true)
  })

  it('waits for a time zone before touching the queue', async () => {
    await fakeChrome.local.set({ [DONE_QUEUE_KEY]: [done(item?.id ?? '', 1)] })
    renderHook(() => useQueuedDones(null))
    await settle(() => Bun.sleep(5))
    expect(fakeChrome.local.data.get(DONE_QUEUE_KEY)).toHaveLength(1)
  })
})
