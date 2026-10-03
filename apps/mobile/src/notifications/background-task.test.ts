import { beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { setPlace } from '@ihsaanly/state/location/store'
import { allActions } from '@ihsaanly/state/storage/events'
import {
  fake,
  installReminderFakes,
  resetReminderFakes,
  taskState,
  tasks,
} from '../../test/reminders'
import { router } from '../../test/router'

installReminderFakes()
const { NOTIFICATION_TASK } = await import('./schedule')
const { onNotificationTask, registerNotificationTask } = await import('./background-task')

let counter = 0

interface TapResponse {
  actionIdentifier: string
  notification: { request: { identifier: string; content: Record<string, unknown> } }
}

function tap(
  actionIdentifier: string,
  data: unknown,
  overrides: Record<string, unknown> = {},
): TapResponse {
  counter += 1
  return {
    actionIdentifier,
    notification: {
      request: {
        identifier: `bg${counter}`,
        content: { title: 'T', body: 'B', data },
        ...overrides,
      },
    },
  }
}

const itemData = { v: 1, kind: 'item', itemId: 'bg-item', endsAt: 8.64e15, reason: 'upcoming' }

function completions(): number {
  return allActions().filter((action) => JSON.stringify(action).includes('bg-item')).length
}

function run(data: unknown, error?: unknown): Promise<void> {
  return onNotificationTask({ data, error })
}

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
  // Each completion is identified by its instant.
  setSystemTime(new Date(Date.UTC(2026, 2, 10, 10, 0, counter + 1)))
  setPlace({ label: 'x', latitude: 0, longitude: 0, timeZone: 'UTC', source: 'device' } as never)
})

describe('the notification response task', () => {
  it('is registered under the shared task name', () => {
    registerNotificationTask()
    expect(tasks[NOTIFICATION_TASK]).toBe(onNotificationTask as never)
  })

  it('does nothing when the task reports an error', async () => {
    const before = completions()
    await run(tap('done', itemData), new Error('boom'))
    expect(completions()).toBe(before)
  })

  it('answers a response delivered directly', async () => {
    const before = completions()
    await run(tap('done', itemData))
    expect(completions()).toBe(before + 1)
  })

  it('finds a response wrapped one level down', async () => {
    const before = completions()
    await run({ payload: { response: tap('done', itemData) } })
    expect(completions()).toBe(before + 1)
  })

  it('never navigates from the background', async () => {
    await run(tap('expo.modules.notifications.actions.DEFAULT', itemData))
    expect(router.calls).toEqual([])
  })

  it('carries the text through a snooze, and falls back to the item id without it', async () => {
    await run(tap('later', itemData))
    const withText = tap('later', itemData)
    withText.notification.request.content = { data: itemData } as never
    await run(withText)
    expect(fake.scheduled.map((request) => request.content.title)).toEqual(['T', 'bg-item'])
  })

  it('ignores payloads that are not a response', async () => {
    const before = completions()
    await run(undefined)
    await run('text')
    await run({ actionIdentifier: 'done' })
    await run({ actionIdentifier: 'done', notification: null })
    await run({
      actionIdentifier: 'done',
      notification: { request: { identifier: 1, content: {} } },
    })
    await run({ actionIdentifier: 'done', notification: { request: { identifier: 'x' } } })
    expect(completions()).toBe(before)
  })
})

describe('when the task manager is unavailable', () => {
  it('registering does not throw', () => {
    taskState.defineThrows = true
    expect(() => registerNotificationTask()).not.toThrow()
  })
})
