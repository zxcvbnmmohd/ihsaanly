import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { announcementTopics, languageTopic } from '@ihsaanly/state/opt-ins/store'

type MessagingModule = typeof import('@react-native-firebase/messaging')
type RemoteMessage = import('@react-native-firebase/messaging').RemoteMessage

/** The part of a pushed message the app reads: what to show, and where a tap goes. */
export interface PushMessage {
  id: string | null
  title: string | null
  body: string | null
  data: Record<string, unknown>
}

/**
 * The seam between the app and Firebase Cloud Messaging. Topics only: this
 * device's token is never sent anywhere by the app, so nobody can address one
 * person, and turning announcements off deletes the token outright.
 */
export interface PushApi {
  /**
   * iOS: registers with APNs, which `firebase.json` stops Firebase doing at
   * every launch for everyone. Called on subscribe and at launch while opted in.
   */
  register: () => Promise<void>
  /** Gets a token (the first one is made here, never at launch) and joins both topics. */
  subscribe: (language: SupportedLanguage) => Promise<void>
  /** Leaves one language's topic for another's. */
  switchLanguage: (from: SupportedLanguage, to: SupportedLanguage) => Promise<void>
  /** Leaves both topics and deletes the token. */
  unsubscribe: (language: SupportedLanguage) => Promise<void>
  /** A message that arrived while the app was open. */
  onForeground: (listener: (message: PushMessage) => void) => () => void
  /** A tap on a message the system showed while the app was in the background. */
  onOpened: (listener: (message: PushMessage) => void) => () => void
  /** The tap that launched the app, if one did. */
  initialOpened: () => Promise<PushMessage | null>
}

function toMessage(message: RemoteMessage): PushMessage {
  return {
    id: message.messageId ?? null,
    title: message.notification?.title ?? null,
    body: message.notification?.body ?? null,
    data: message.data ?? {},
  }
}

function pushApi(module: MessagingModule): PushApi {
  const messaging = module.getMessaging()
  const register = async (): Promise<void> => {
    // iOS needs the APNs registration before a token; on Android it is a no-op.
    if (!module.isDeviceRegisteredForRemoteMessages(messaging)) {
      await module.registerDeviceForRemoteMessages(messaging)
    }
  }
  return {
    register,
    subscribe: async (language) => {
      await register()
      await module.getToken(messaging)
      for (const topic of announcementTopics(language)) {
        await module.subscribeToTopic(messaging, topic)
      }
    },
    switchLanguage: async (from, to) => {
      await module.unsubscribeFromTopic(messaging, languageTopic(from))
      await module.subscribeToTopic(messaging, languageTopic(to))
    },
    unsubscribe: async (language) => {
      for (const topic of announcementTopics(language)) {
        await module.unsubscribeFromTopic(messaging, topic)
      }
      await module.deleteToken(messaging)
    },
    onForeground: (listener) =>
      module.onMessage(messaging, (message) => listener(toMessage(message))),
    onOpened: (listener) =>
      module.onNotificationOpenedApp(messaging, (message) => listener(toMessage(message))),
    initialOpened: async () => {
      try {
        const message = await module.getInitialNotification(messaging)
        return message ? toMessage(message) : null
      } catch {
        return null
      }
    },
  }
}

/**
 * Null where there is no native Firebase: Expo Go, or a build made before
 * the module was added. Announcements are optional; their absence degrades.
 * `load` is the import, replaceable so a test can make it fail.
 */
export async function loadPush(
  load: () => Promise<MessagingModule> = () => import('@react-native-firebase/messaging'),
): Promise<PushApi | null> {
  try {
    return pushApi(await load())
  } catch {
    return null
  }
}
