/**
 * Fakes for React Native Firebase's messaging and crashlytics modules, which
 * have no native side under Bun. `setup.ts` registers them for every test,
 * since the root layout reaches both; a test reads and drives `push` and
 * `crash`, and `resetFirebaseFakes()` wipes them.
 */
import { mock } from 'bun:test'

export interface FakeRemoteMessage {
  messageId?: string
  notification?: { title?: string; body?: string }
  data?: Record<string, string>
}

export const push = {
  registered: false,
  /** Every call, in order: `['subscribe', 'announcements']`. */
  calls: [] as string[][],
  topics: new Set<string>(),
  token: null as string | null,
  initial: null as FakeRemoteMessage | null,
  foreground: [] as ((message: FakeRemoteMessage) => void)[],
  opened: [] as ((message: FakeRemoteMessage) => void)[],
  unsubscribed: 0,
  backgroundHandlers: [] as unknown[],
  /** Function names that should reject (or throw). */
  failing: new Set<string>(),
  /** Runs while a token is being made, to act in the middle of a pass. */
  duringGetToken: null as (() => void) | null,
}

export const crash = {
  collection: null as boolean | null,
  deletedUnsent: 0,
  recorded: [] as { name: string; message: string; jsErrorName: string | undefined }[],
  userIds: [] as string[],
  failing: new Set<string>(),
}

export function resetFirebaseFakes(): void {
  push.registered = false
  push.calls = []
  push.topics = new Set()
  push.token = null
  push.initial = null
  push.foreground = []
  push.opened = []
  push.unsubscribed = 0
  push.backgroundHandlers = []
  push.failing.clear()
  push.duringGetToken = null
  crash.collection = null
  crash.deletedUnsent = 0
  crash.recorded = []
  crash.userIds = []
  crash.failing.clear()
}

function fail(set: Set<string>, name: string): void {
  if (set.has(name)) throw new Error(`${name} failed`)
}

function listen(
  list: ((message: FakeRemoteMessage) => void)[],
  listener: (message: FakeRemoteMessage) => void,
): () => void {
  list.push(listener)
  return () => {
    push.unsubscribed += 1
    list.splice(list.indexOf(listener), 1)
  }
}

const messagingModule = {
  getMessaging: () => {
    fail(push.failing, 'getMessaging')
    return { app: 'default' }
  },
  isDeviceRegisteredForRemoteMessages: () => push.registered,
  registerDeviceForRemoteMessages: async () => {
    fail(push.failing, 'registerDeviceForRemoteMessages')
    push.calls.push(['register'])
    push.registered = true
  },
  getToken: async () => {
    fail(push.failing, 'getToken')
    push.duringGetToken?.()
    push.calls.push(['getToken'])
    push.token = 'token-1'
    return push.token
  },
  deleteToken: async () => {
    fail(push.failing, 'deleteToken')
    push.calls.push(['deleteToken'])
    push.token = null
  },
  subscribeToTopic: async (_messaging: unknown, topic: string) => {
    fail(push.failing, 'subscribeToTopic')
    push.calls.push(['subscribe', topic])
    push.topics.add(topic)
  },
  unsubscribeFromTopic: async (_messaging: unknown, topic: string) => {
    fail(push.failing, 'unsubscribeFromTopic')
    push.calls.push(['unsubscribe', topic])
    push.topics.delete(topic)
  },
  onMessage: (_messaging: unknown, listener: (message: FakeRemoteMessage) => void) =>
    listen(push.foreground, listener),
  onNotificationOpenedApp: (_messaging: unknown, listener: (message: FakeRemoteMessage) => void) =>
    listen(push.opened, listener),
  getInitialNotification: async () => {
    fail(push.failing, 'getInitialNotification')
    return push.initial
  },
  setBackgroundMessageHandler: (_messaging: unknown, handler: unknown) => {
    push.backgroundHandlers.push(handler)
  },
}

const crashlyticsModule = {
  getCrashlytics: () => {
    fail(crash.failing, 'getCrashlytics')
    return { app: 'default' }
  },
  deleteUnsentReports: async () => {
    fail(crash.failing, 'deleteUnsentReports')
    crash.deletedUnsent += 1
  },
  setCrashlyticsCollectionEnabled: async (_crashlytics: unknown, enabled: boolean) => {
    fail(crash.failing, 'setCrashlyticsCollectionEnabled')
    crash.collection = enabled
    return null
  },
  recordError: (_crashlytics: unknown, error: Error, jsErrorName?: string) => {
    fail(crash.failing, 'recordError')
    crash.recorded.push({ name: error.name, message: error.message, jsErrorName })
  },
  setUserId: async (_crashlytics: unknown, id: string) => {
    crash.userIds.push(id)
    return null
  },
}

export function installFirebaseFakes(): void {
  mock.module('@react-native-firebase/messaging', () => messagingModule)
  mock.module('@react-native-firebase/crashlytics', () => crashlyticsModule)
}
