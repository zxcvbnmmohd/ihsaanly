import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { announcementData } from '@ihsaanly/state/notifications/payload'
import { useAnnouncements as useAnnouncementsPreference } from '@ihsaanly/state/opt-ins/store'
import { getStrings } from '@ihsaanly/state/strings'
import { useEffect } from 'react'
import { reconcileAnnouncements, showForeground } from './announcements'
import { loadPush, type PushMessage } from './firebase'
import { openAnnouncement } from './open'

function openMessage(message: PushMessage): void {
  const data = announcementData(message.data)
  if (data?.kind === 'announcement') openAnnouncement(data)
}

/**
 * Mounted once in the root layout; `active` is false during onboarding, when
 * there is nowhere to navigate to yet. Keeps the topics in line with the
 * switch and the app language and, while opted in, shows messages that arrive
 * while the app is open and follows taps on ones the system showed.
 */
export function useAnnouncements(active: boolean): void {
  const language = supportedLanguageOf(useLocale())
  const preference = useAnnouncementsPreference()
  // Firebase is not touched at all for someone who never turned the switch on.
  const optedIn = preference.enabled || preference.subscribed !== null

  useEffect(() => {
    if (active) void reconcileAnnouncements(language)
  }, [active, language])

  useEffect(() => {
    if (!active || !optedIn) return

    let cancelled = false
    let stops: (() => void)[] = []

    const start = async (): Promise<void> => {
      const push = await loadPush()
      if (!push) return
      await push.register().catch(() => {
        // No APNs this launch; the registration from an earlier one still stands.
      })
      const initial = await push.initialOpened()
      if (cancelled) return
      if (initial) openMessage(initial)
      stops = [
        push.onForeground((message) => void showForeground(message, getStrings())),
        push.onOpened(openMessage),
      ]
    }

    void start()

    return (): void => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [active, optedIn])
}
