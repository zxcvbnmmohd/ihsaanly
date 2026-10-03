/**
 * Fakes for the native modules behind reminders and background tasks:
 * expo-notifications, expo-task-manager and expo-constants. Mocks are
 * process-wide, so a test calls `installReminderFakes()` in `beforeEach`
 * (it re-registers them, whatever another file left behind) and the state here
 * is wiped by `resetReminderFakes()`.
 */
import { mock } from 'bun:test'

export interface ScheduledRequest {
  identifier: string
  content: Record<string, unknown>
  trigger: Record<string, unknown> | null
}

export const fake = {
  /** `Constants.executionEnvironment`. */
  executionEnvironment: 'standalone',
  appVersion: '1.2.3' as string | undefined,
  permissions: { granted: false, canAskAgain: true },
  /** What `requestPermissionsAsync` answers. */
  requestResult: { granted: true },
  scheduled: [] as ScheduledRequest[],
  cancelled: [] as string[],
  channels: [] as string[],
  categories: [] as { id: string; actions: unknown[] }[],
  registeredTasks: [] as string[],
  handlers: [] as unknown[],
  responseListeners: [] as ((response: unknown) => void)[],
  removedListeners: 0,
  lastResponse: null as unknown,
  clearedLastResponse: 0,
  /** Method names that should reject. */
  failing: new Set<string>(),
}

/** Task bodies by name; not cleared by a reset, because modules define theirs once. */
export const tasks: Record<string, (body: { data?: unknown; error?: unknown }) => Promise<void>> =
  {}
export const taskState = { registered: new Set<string>(), defineThrows: false }

export function resetReminderFakes(): void {
  fake.executionEnvironment = 'standalone'
  fake.appVersion = '1.2.3'
  fake.permissions = { granted: false, canAskAgain: true }
  fake.requestResult = { granted: true }
  fake.scheduled = []
  fake.cancelled = []
  fake.channels = []
  fake.categories = []
  fake.registeredTasks = []
  fake.handlers = []
  fake.responseListeners = []
  fake.removedListeners = 0
  fake.lastResponse = null
  fake.clearedLastResponse = 0
  fake.failing.clear()
  taskState.registered.clear()
  taskState.defineThrows = false
}

function maybeFail(name: string): void {
  if (fake.failing.has(name)) throw new Error(`${name} failed`)
}

export function notificationsModule(): Record<string, unknown> {
  return {
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { DEFAULT: 3 },
    scheduleNotificationAsync: async (request: ScheduledRequest & Record<string, unknown>) => {
      maybeFail('scheduleNotificationAsync')
      fake.scheduled.push({
        identifier: request.identifier,
        content: request.content,
        trigger: request.trigger,
      })
      return request.identifier
    },
    getAllScheduledNotificationsAsync: async () => {
      maybeFail('getAllScheduledNotificationsAsync')
      return fake.scheduled
    },
    cancelScheduledNotificationAsync: async (id: string) => {
      maybeFail('cancelScheduledNotificationAsync')
      fake.cancelled.push(id)
      fake.scheduled = fake.scheduled.filter((request) => request.identifier !== id)
    },
    getPermissionsAsync: async () => {
      maybeFail('getPermissionsAsync')
      return fake.permissions
    },
    requestPermissionsAsync: async () => {
      maybeFail('requestPermissionsAsync')
      return fake.requestResult
    },
    setNotificationChannelAsync: async (id: string) => {
      maybeFail('setNotificationChannelAsync')
      fake.channels.push(id)
    },
    setNotificationCategoryAsync: async (id: string, actions: unknown[]) => {
      maybeFail('setNotificationCategoryAsync')
      fake.categories.push({ id, actions })
    },
    registerTaskAsync: async (name: string) => {
      maybeFail('registerTaskAsync')
      fake.registeredTasks.push(name)
    },
    setNotificationHandler: (handler: unknown) => {
      fake.handlers.push(handler)
    },
    getLastNotificationResponseAsync: async () => fake.lastResponse,
    clearLastNotificationResponseAsync: async () => {
      fake.clearedLastResponse += 1
    },
    addNotificationResponseReceivedListener: (listener: (response: unknown) => void) => {
      fake.responseListeners.push(listener)
      return {
        remove: () => {
          fake.removedListeners += 1
        },
      }
    },
  }
}

/** Registers every fake. `notifications` replaces the expo-notifications surface (a half-loaded one, say). */
export function installReminderFakes(
  notifications: Record<string, unknown> = notificationsModule(),
): void {
  mock.module('expo-notifications', () => notifications)
  mock.module('expo-constants', () => ({
    default: {
      get executionEnvironment() {
        return fake.executionEnvironment
      },
      get expoConfig() {
        return fake.appVersion === undefined ? null : { version: fake.appVersion }
      },
    },
    ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
  }))
  mock.module('expo-task-manager', () => ({
    defineTask: (name: string, body: (typeof tasks)[string]) => {
      if (taskState.defineThrows) throw new Error('TaskManager unavailable')
      tasks[name] = body
    },
    isTaskRegisteredAsync: async (name: string) => taskState.registered.has(name),
  }))
}
