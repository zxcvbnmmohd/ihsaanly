import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import { AppState } from 'react-native'
import { run } from '../../test/act'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'

installReminderFakes()
const { useNotificationSync } = await import('./use-sync')

let listeners: ((state: string) => void)[] = []
let removed = 0
let spy: ReturnType<typeof spyOn>

const at = new Date(Date.now() + 3_600_000)

function planWith(...prayers: string[]): never {
  return {
    notifications: prayers.map((prayer) => ({ kind: 'prayer', prayer, at, jumuah: false })),
  } as never
}

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
  listeners = []
  removed = 0
  spy = spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (s: string) => void,
  ) => {
    listeners.push(listener)
    return {
      remove: () => {
        removed += 1
      },
    }
  }) as never)
})

afterEach(() => spy.mockRestore())

describe('useNotificationSync', () => {
  it('does nothing without a plan', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    renderHook(() => useNotificationSync(null))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(listeners).toEqual([])
    expect(fake.scheduled).toEqual([])
  })

  it('never asks and schedules nothing without permission', async () => {
    renderHook(() => useNotificationSync(planWith('fajr')))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.scheduled).toEqual([])
    expect(fake.categories).toEqual([])
  })

  it('schedules the plan once permission is granted', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    renderHook(() => useNotificationSync(planWith('fajr')))
    await waitFor(() => expect(fake.scheduled.length).toBeGreaterThan(0))
    expect(fake.scheduled[0]?.identifier.startsWith('plan:')).toBe(true)
  })

  it('does not reschedule when only the plan object changes', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    const view = renderHook(({ plan }) => useNotificationSync(plan), {
      initialProps: { plan: planWith('fajr') },
    })
    await waitFor(() => expect(fake.scheduled.length).toBeGreaterThan(0))
    expect(listeners).toHaveLength(1)
    view.rerender({ plan: planWith('fajr') })
    expect(listeners).toHaveLength(1)
    expect(removed).toBe(0)
  })

  it('re-arms when the app returns to the foreground', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    renderHook(() => useNotificationSync(planWith('fajr')))
    await waitFor(() => expect(fake.scheduled.length).toBeGreaterThan(0))

    fake.scheduled = []
    await run(async () => {
      listeners[0]?.('background')
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.scheduled).toEqual([])

    await run(async () => {
      listeners[0]?.('active')
    })
    await waitFor(() => expect(fake.scheduled.length).toBeGreaterThan(0))
  })

  it('skips entries whose item is not in the content', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    const plan = {
      notifications: [{ kind: 'item', itemId: 'no-such-item', at, reason: 'upcoming' }],
    } as never
    renderHook(() => useNotificationSync(plan))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.scheduled).toEqual([])
  })

  it('reschedules when the set of reminders changes', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    const view = renderHook(({ plan }) => useNotificationSync(plan), {
      initialProps: { plan: planWith('fajr') },
    })
    await waitFor(() => expect(fake.scheduled).toHaveLength(1))
    view.rerender({ plan: planWith('fajr', 'dhuhr') })
    await waitFor(() => expect(fake.scheduled).toHaveLength(2))
    expect(removed).toBe(1)
  })

  it('stops listening on unmount', async () => {
    const view = renderHook(() => useNotificationSync(planWith('fajr')))
    view.unmount()
    expect(removed).toBe(1)
  })

  it('does not schedule if it was torn down while checking permission', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    const view = renderHook(() => useNotificationSync(planWith('fajr')))
    view.unmount()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fake.scheduled).toEqual([])
  })
})
