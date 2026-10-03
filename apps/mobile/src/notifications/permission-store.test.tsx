import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import { AppState } from 'react-native'
import { run } from '../../test/act'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'

installReminderFakes()
const { refreshPermissionStatus, usePermissionStatus } = await import('./permission-store')

let listeners: ((state: string) => void)[] = []
let removed = 0
let spy: ReturnType<typeof spyOn>

beforeEach(async () => {
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
  // The store is module-level; settle it at "undetermined" for each test.
  fake.permissions = { granted: false, canAskAgain: true }
  await refreshPermissionStatus()
})

afterEach(() => spy.mockRestore())

describe('usePermissionStatus', () => {
  it('reads the OS permission on mount', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    const view = renderHook(() => usePermissionStatus())
    await waitFor(() => expect(view.result.current).toBe('granted'))
  })

  it('refreshes when the app returns to the foreground, not when it leaves', async () => {
    const view = renderHook(() => usePermissionStatus())
    await waitFor(() => expect(listeners).toHaveLength(1))
    expect(view.result.current).toBe('undetermined')

    fake.permissions = { granted: false, canAskAgain: false }
    await run(async () => {
      listeners[0]?.('background')
      await Promise.resolve()
    })
    expect(view.result.current).toBe('undetermined')

    await run(async () => {
      listeners[0]?.('active')
    })
    await waitFor(() => expect(view.result.current).toBe('denied'))
  })

  it('stops listening on unmount', async () => {
    const view = renderHook(() => usePermissionStatus())
    await waitFor(() => expect(listeners).toHaveLength(1))
    view.unmount()
    expect(removed).toBe(1)
  })
})

describe('refreshPermissionStatus', () => {
  it('does not notify subscribers when nothing changed', async () => {
    let renders = 0
    const view = renderHook(() => {
      renders += 1
      return usePermissionStatus()
    })
    await waitFor(() => expect(listeners).toHaveLength(1))
    const before = renders
    await run(async () => {
      await refreshPermissionStatus()
    })
    expect(renders).toBe(before)
    expect(view.result.current).toBe('undetermined')
  })
})
