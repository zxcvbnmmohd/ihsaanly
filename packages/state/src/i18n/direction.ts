import { isRightToLeft, type SupportedLocale } from '@ihsaanly/core/i18n/locale'
import { reloadAppAsync } from 'expo'
import { I18nManager, Platform } from 'react-native'

const RELOAD_DELAY_MS = 300

/**
 * Layout direction is a native setting that takes effect when the tree is
 * next built, so a real change needs a reload to become visible. Every style
 * already uses logical directions, so nothing else has to move.
 *
 * Returns true when the change needs the app reopened by hand, which is iOS
 * only. Android recreates the activity on a reload, so the new direction is
 * picked up there. UIKit reads layout direction once, when the process
 * starts, so a JavaScript reload flips the content and leaves the navigation
 * bar mirrored the old way — a half-turned screen that looks like a bug,
 * because it is one. An app cannot relaunch itself on iOS, so the caller says
 * so instead.
 */
export function applyDirection(locale: SupportedLocale): boolean {
  const shouldBeRtl = isRightToLeft(locale)
  const directionChanges = shouldBeRtl !== I18nManager.isRTL

  if (directionChanges) {
    I18nManager.allowRTL(shouldBeRtl)
    I18nManager.forceRTL(shouldBeRtl)
  }

  if (!directionChanges) return false
  if (Platform.OS === 'ios') return true

  // The RTL flags are written by native calls that are still in flight when
  // this returns; reloading at once has been seen to lose the second write.
  // ponytail: a fixed delay rather than a completion signal, which the API
  // does not offer.
  setTimeout(() => void reloadAppAsync('layout direction changed'), RELOAD_DELAY_MS)
  return false
}
