import { languageOf } from '@ihsaanly/core/i18n/locale'
import { notifyContentForeground, startContentUpdates } from '@ihsaanly/state/content/updater'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { AppState } from 'react-native'

/**
 * Looks for newer content after the first render and whenever the app comes
 * back to the foreground (at most every six hours), for the next open. A
 * no-op without EXPO_PUBLIC_CONTENT_URL: the app shows what it shipped with.
 * Returns a stop function.
 */
export function startMobileContentUpdates(
  // Expo inlines EXPO_PUBLIC_ variables only on a literal `process.env.NAME` read.
  url: string | undefined = process.env.EXPO_PUBLIC_CONTENT_URL,
): () => void {
  const stop = startContentUpdates(url, () => languageOf(getLocale()))
  if (!url?.trim()) return stop
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') notifyContentForeground()
  })
  return (): void => {
    subscription.remove()
    stop()
  }
}
