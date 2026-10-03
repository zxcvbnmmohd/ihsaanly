import { type SupportedLanguage, supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { announcementData } from '@ihsaanly/state/notifications/payload'
import { getAnnouncements, setAnnouncements } from '@ihsaanly/state/opt-ins/store'
import { noteFailure } from '@ihsaanly/state/storage/events'
import type { Strings } from '@ihsaanly/state/strings'
import { Platform } from 'react-native'
import { refreshPermissionStatus } from '@/notifications/permission-store'
import { ensurePermission, hasPermission, notifications } from '@/notifications/schedule'
import { loadPush, type PushMessage } from './firebase'

function currentLanguage(): SupportedLanguage {
  return supportedLanguageOf(getLocale())
}

/**
 * One pass towards what the person chose: subscribe, switch language, or
 * leave. The preference is re-read after each await and only `subscribed` is
 * written, so a switch flipped mid-pass is not overwritten; the next pass
 * (which the flip itself queues) picks it up.
 */
async function step(language: SupportedLanguage): Promise<void> {
  const { enabled, subscribed } = getAnnouncements()
  const wanted = enabled ? language : null
  if (subscribed === wanted) return

  const push = await loadPush()
  if (!push) return

  try {
    if (subscribed === null) await push.subscribe(language)
    else if (wanted === null) await push.unsubscribe(subscribed)
    else await push.switchLanguage(subscribed, wanted)
    setAnnouncements({ ...getAnnouncements(), subscribed: wanted })
  } catch (error) {
    // Offline, or no APNs registration yet. `subscribed` still says what is
    // true, so the next launch or language change tries again.
    noteFailure('announcements', error)
  }
}

let queue: Promise<void> = Promise.resolve()

/** Brings the topic subscriptions in line with the preference. Passes run one at a time. */
export function reconcileAnnouncements(
  language: SupportedLanguage = currentLanguage(),
): Promise<void> {
  queue = queue.then(() => step(language))
  return queue
}

/**
 * The Announcements switch. Turning it on asks for notification permission
 * the same way reminders do, and stays off if it is refused; turning it off
 * leaves both topics and deletes the token. Resolves to whether it is on.
 */
export async function setAnnouncementsEnabled(on: boolean, strings: Strings): Promise<boolean> {
  if (on) {
    const granted = await ensurePermission(strings)
    // The Permission row above the switch shows the answer, and offers system
    // settings when the answer was no.
    await refreshPermissionStatus()
    if (!granted) return false
  }
  setAnnouncements({ ...getAnnouncements(), enabled: on })
  await reconcileAnnouncements()
  return on
}

/**
 * A message that arrives while the app is open. Android shows nothing for it,
 * so it is shown on the reminders channel, as a reminder would be. iOS already
 * shows it through the expo-notifications handler, so it is not shown twice.
 */
export async function showForeground(message: PushMessage, strings: Strings): Promise<void> {
  if (Platform.OS !== 'android' || (!message.title && !message.body)) return
  const api = await notifications()
  if (!api || !(await hasPermission(strings))) return

  try {
    await api.scheduleNotificationAsync({
      identifier: `announcement:${message.id ?? Date.now()}`,
      content: {
        title: message.title ?? '',
        body: message.body ?? '',
        data: announcementData(message.data) ?? {},
      },
      trigger: { channelId: 'reminders' },
    })
  } catch (error) {
    noteFailure('announcementShow', error)
  }
}
