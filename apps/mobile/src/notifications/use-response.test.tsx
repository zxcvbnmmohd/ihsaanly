import { beforeEach, describe, expect, it } from 'bun:test'
import { DEFAULT_ACTION } from '@ihsaanly/state/notifications/payload'
import { renderHook, waitFor } from '@testing-library/react'
import {
  fake,
  installReminderFakes,
  notificationsModule,
  resetReminderFakes,
} from '../../test/reminders'
import { router } from '../../test/router'

installReminderFakes()
const { useNotificationResponse } = await import('./use-response')

let counter = 0

function tap(kind: 'test' | 'prayer' = 'test'): Record<string, unknown> {
  counter += 1
  return {
    actionIdentifier: DEFAULT_ACTION,
    notification: {
      request: {
        identifier: `resp${counter}`,
        content: {
          title: 't',
          body: 'b',
          data: kind === 'test' ? { v: 1, kind: 'test' } : { v: 1, kind: 'prayer', prayer: 'asr' },
        },
      },
    },
  }
}

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
})

describe('useNotificationResponse', () => {
  it('does nothing while disabled', async () => {
    renderHook(() => useNotificationResponse(false))
    await Promise.resolve()
    expect(fake.handlers).toEqual([])
    expect(fake.responseListeners).toEqual([])
  })

  it('does nothing where reminders are unavailable', async () => {
    fake.executionEnvironment = 'storeClient'
    renderHook(() => useNotificationResponse(true))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.handlers).toEqual([])
  })

  it('shows reminders as banners without sound or badge', async () => {
    renderHook(() => useNotificationResponse(true))
    await waitFor(() => expect(fake.handlers).toHaveLength(1))
    const handler = fake.handlers[0] as { handleNotification: () => Promise<unknown> }
    expect(await handler.handleNotification()).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    })
  })

  it('answers the response that launched the app once, then clears it', async () => {
    fake.lastResponse = tap()
    renderHook(() => useNotificationResponse(true))
    await waitFor(() => expect(fake.clearedLastResponse).toBe(1))
    expect(router.calls).toEqual([['push', '/notifications']])
  })

  it('forwards warm responses and stops listening on unmount', async () => {
    const view = renderHook(() => useNotificationResponse(true))
    await waitFor(() => expect(fake.responseListeners).toHaveLength(1))
    fake.responseListeners[0]?.(tap('prayer'))
    await waitFor(() => expect(router.calls).toEqual([['push', '/']]))
    view.unmount()
    expect(fake.removedListeners).toBe(1)
  })

  it('does not subscribe if it was torn down before the library loaded', async () => {
    const view = renderHook(() => useNotificationResponse(true))
    view.unmount()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.handlers).toEqual([])
    expect(fake.responseListeners).toEqual([])
  })

  it('does not leave a listener behind when torn down while reading the launch response', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    installReminderFakes({
      ...notificationsModule(),
      getLastNotificationResponseAsync: async () => {
        await gate
        return null
      },
    })
    const view = renderHook(() => useNotificationResponse(true))
    await waitFor(() => expect(fake.handlers).toHaveLength(1))
    view.unmount()
    release()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(fake.responseListeners).toEqual([])
  })

  it('does not answer a launch response it was torn down before reading', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    installReminderFakes({
      ...notificationsModule(),
      getLastNotificationResponseAsync: async () => {
        await gate
        return tap()
      },
    })
    const view = renderHook(() => useNotificationResponse(true))
    await waitFor(() => expect(fake.handlers).toHaveLength(1))
    view.unmount()
    release()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(router.calls).toEqual([])
    expect(fake.clearedLastResponse).toBe(0)
  })
})
