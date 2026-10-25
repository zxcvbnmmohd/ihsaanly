import { isRightToLeft, type SupportedLocale } from '@ihsaanly/core/i18n/locale'
import { reloadAppAsync } from 'expo'
import { I18nManager } from 'react-native'

const RELOAD_DELAY_MS = 300

/**
 * Layout direction is a native setting that takes effect when the tree is
 * next built, so a real change reloads the app, on iOS and Android alike.
 * Every style already uses logical directions, so nothing else has to move.
 *
 * The native chrome follows on the reload because it is told the direction
 * rather than left to guess it: expo-router's NavigationContainer reads
 * `I18nManager` for the stack headers, which react-native-screens then forces
 * onto the navigation bar, and the root layout passes the same answer to the
 * native tab bar. Left alone, UIKit would keep the direction the process
 * started with, which is why this used to ask iOS users to reopen by hand.
 */
export function applyDirection(locale: SupportedLocale): void {
  const shouldBeRtl = isRightToLeft(locale)
  if (shouldBeRtl === I18nManager.isRTL) return

  I18nManager.allowRTL(shouldBeRtl)
  I18nManager.forceRTL(shouldBeRtl)

  // The RTL flags are written by native calls that are still in flight when
  // this returns; reloading at once has been seen to lose the second write.
  // ponytail: a fixed delay rather than a completion signal, which the API
  // does not offer.
  setTimeout(() => void reloadAppAsync('layout direction changed'), RELOAD_DELAY_MS)
}
