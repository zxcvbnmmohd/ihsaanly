import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { Platform } from 'react-native'
import {
  fake,
  installReminderFakes,
  notificationsModule,
  resetReminderFakes,
} from '../../test/reminders'

installReminderFakes()
const schedule = await import('./schedule')

const strings = {
  notifications: {
    title: 'Reminders',
    prayers: 'Prayers',
    testTitle: 'Test',
    testBody: 'Body',
    action: { done: 'Done', later: 'Later' },
  },
} as never

function content(id: string, inMs: number): never {
  return {
    identifier: id,
    title: `title ${id}`,
    body: `body ${id}`,
    at: new Date(Date.now() + inMs),
    channelId: 'reminders',
    categoryIdentifier: 'reminder',
    data: { v: 1, kind: 'item', itemId: id, endsAt: 0 },
  } as never
}

afterAll(() => {
  Platform.OS = 'web'
})

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
  Platform.OS = 'ios' as never
})

describe('notifications()', () => {
  it('is null when the import throws', async () => {
    const failing = (): Promise<never> => Promise.reject(new Error('native module missing'))
    expect(await schedule.notifications(failing)).toBeNull()
  })

  it('is null in Expo Go without importing the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.notifications()).toBeNull()
  })

  it('is null when the import resolves half-populated', async () => {
    installReminderFakes({ ...notificationsModule(), AndroidImportance: undefined })
    expect(await schedule.notifications()).toBeNull()
  })

  it('returns the library when it is usable', async () => {
    expect(await schedule.notifications()).not.toBeNull()
  })
})

describe('permissionStatus', () => {
  it('is unavailable without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.permissionStatus()).toBe('unavailable')
  })

  it('maps granted, askable and blocked', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    expect(await schedule.permissionStatus()).toBe('granted')
    fake.permissions = { granted: false, canAskAgain: true }
    expect(await schedule.permissionStatus()).toBe('undetermined')
    fake.permissions = { granted: false, canAskAgain: false }
    expect(await schedule.permissionStatus()).toBe('denied')
  })

  it('is unavailable when the query throws', async () => {
    fake.failing.add('getPermissionsAsync')
    expect(await schedule.permissionStatus()).toBe('unavailable')
  })
})

describe('ensurePermission', () => {
  it('is false without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.ensurePermission(strings)).toBe(false)
  })

  it('prepares the category and task, then asks only if not yet granted', async () => {
    expect(await schedule.ensurePermission(strings)).toBe(true)
    expect(fake.categories.map((entry) => entry.id)).toEqual(['reminder'])
    expect(fake.registeredTasks).toEqual([schedule.NOTIFICATION_TASK])
    expect(fake.channels).toEqual([])
  })

  it('does not ask again when already granted', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    fake.requestResult = { granted: false }
    expect(await schedule.ensurePermission(strings)).toBe(true)
  })

  it('reports a refusal', async () => {
    fake.requestResult = { granted: false }
    expect(await schedule.ensurePermission(strings)).toBe(false)
  })

  it('declares both channels on Android', async () => {
    Platform.OS = 'android' as never
    await schedule.ensurePermission(strings)
    expect(fake.channels).toEqual(['reminders', 'prayers'])
  })

  it('carries on when the background task cannot be registered', async () => {
    fake.failing.add('registerTaskAsync')
    expect(await schedule.ensurePermission(strings)).toBe(true)
  })

  it('is false when preparing throws', async () => {
    fake.failing.add('setNotificationCategoryAsync')
    expect(await schedule.ensurePermission(strings)).toBe(false)
  })
})

describe('hasPermission', () => {
  it('is false without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.hasPermission(strings)).toBe(false)
  })

  it('never asks and declares nothing when not granted', async () => {
    expect(await schedule.hasPermission(strings)).toBe(false)
    expect(fake.categories).toEqual([])
  })

  it('prepares delivery once granted', async () => {
    fake.permissions = { granted: true, canAskAgain: true }
    expect(await schedule.hasPermission(strings)).toBe(true)
    expect(fake.categories).toHaveLength(1)
  })

  it('is false when the check throws', async () => {
    fake.failing.add('getPermissionsAsync')
    expect(await schedule.hasPermission(strings)).toBe(false)
  })
})

describe('pendingReminders', () => {
  it('is empty without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.pendingReminders()).toEqual([])
  })

  it('lists identifiers and trigger instants only', async () => {
    fake.scheduled = [
      { identifier: 'a', content: { title: 'secret' }, trigger: { value: 0 } },
      { identifier: 'b', content: {}, trigger: null },
    ]
    expect(await schedule.pendingReminders()).toEqual([
      { id: 'a', at: '1970-01-01T00:00:00.000Z' },
      { id: 'b', at: null },
    ])
  })

  it('is empty when reading throws', async () => {
    fake.failing.add('getAllScheduledNotificationsAsync')
    expect(await schedule.pendingReminders()).toEqual([])
  })
})

describe('sync', () => {
  it('is 0 without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.sync([content('plan:x', 1000)])).toBe(0)
  })

  it('schedules new future entries and counts them', async () => {
    const count = await schedule.sync([content('plan:a', 60_000), content('plan:b', -60_000)])
    expect(count).toBe(1)
    expect(fake.scheduled.map((request) => request.identifier)).toEqual(['plan:a'])
    expect(fake.scheduled[0]?.content).toMatchObject({
      title: 'title plan:a',
      categoryIdentifier: 'reminder',
    })
    expect(fake.scheduled[0]?.trigger).toMatchObject({ type: 'date', channelId: 'reminders' })
  })

  it('cancels stale plan entries but leaves snoozes alone', async () => {
    fake.scheduled = [
      { identifier: 'plan:old', content: {}, trigger: null },
      { identifier: 'later:keep@1', content: {}, trigger: null },
    ]
    await schedule.sync([])
    expect(fake.cancelled).toEqual(['plan:old'])
  })

  it('is 0 when the library throws', async () => {
    fake.failing.add('getAllScheduledNotificationsAsync')
    expect(await schedule.sync([content('plan:a', 60_000)])).toBe(0)
  })

  it('omits the category when the entry has none', async () => {
    const entry = {
      ...(content('plan:c', 60_000) as object),
      categoryIdentifier: undefined,
    } as never
    await schedule.sync([entry])
    expect(fake.scheduled[0]?.content).not.toHaveProperty('categoryIdentifier')
  })
})

describe('scheduleLater', () => {
  it('is false without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.scheduleLater(content('later:a', 1000))).toBe(false)
  })

  it('schedules the entry', async () => {
    expect(await schedule.scheduleLater(content('later:a', 1000))).toBe(true)
    expect(fake.scheduled).toHaveLength(1)
  })

  it('is false when scheduling throws', async () => {
    fake.failing.add('scheduleNotificationAsync')
    expect(await schedule.scheduleLater(content('later:a', 1000))).toBe(false)
  })
})

describe('scheduleTest', () => {
  it('is false without the library', async () => {
    fake.executionEnvironment = 'storeClient'
    expect(await schedule.scheduleTest(strings)).toBe(false)
  })

  it('schedules a test reminder about five seconds out', async () => {
    const before = Date.now()
    expect(await schedule.scheduleTest(strings)).toBe(true)
    const request = fake.scheduled[0]
    expect(request?.identifier.startsWith('test:')).toBe(true)
    expect(request?.content).toMatchObject({
      title: 'Test',
      body: 'Body',
      data: { v: 1, kind: 'test' },
    })
    const trigger = request?.trigger as { date: Date }
    const date = trigger.date.getTime()
    expect(date - before).toBeGreaterThanOrEqual(4_900)
  })

  it('is false when scheduling throws', async () => {
    fake.failing.add('scheduleNotificationAsync')
    expect(await schedule.scheduleTest(strings)).toBe(false)
  })
})

it('notificationsModule is a usable surface', () => {
  expect(Object.keys(notificationsModule())).toContain('scheduleNotificationAsync')
})
