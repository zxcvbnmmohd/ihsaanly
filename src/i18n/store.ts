import { reloadAppAsync } from 'expo'
import { I18nManager, Platform } from 'react-native'
import { z } from 'zod'

import { setContentLanguage } from '@/content'
import { createPreferenceStore } from '@/storage/preference-store'

import { deviceLocaleTags } from './device'

import {
  isRightToLeft,
  languageOf,
  localeForLanguage,
  resolveLocale,
  SUPPORTED_LOCALES,
  type SupportedLanguage,
  type SupportedLocale,
} from './locale'

const Locale = z.enum(SUPPORTED_LOCALES)
const RELOAD_DELAY_MS = 300

function deviceLocale(): SupportedLocale {
  return resolveLocale(deviceLocaleTags())
}

const store = createPreferenceStore<SupportedLocale>('locale', Locale, deviceLocale())

export const setLocale = store.set
export const useLocale = store.use
export const getLocale = store.get

/**
 * Layout direction is a native setting that takes effect when the tree is
 * next built; chooseLanguage reloads for it. Every style already uses logical
 * directions, so nothing else has to move.
 */
export function applyDirection(locale: SupportedLocale): void {
  const shouldBeRtl = isRightToLeft(locale)
  if (I18nManager.isRTL === shouldBeRtl) return

  I18nManager.allowRTL(shouldBeRtl)
  I18nManager.forceRTL(shouldBeRtl)
}

/** Persist the choice, switch content, and ask for the matching layout direction. */
function chooseLocale(locale: SupportedLocale): void {
  setLocale(locale)
  setContentLanguage(languageOf(locale))
  applyDirection(locale)
}

/**
 * The user picks a language; the device decides which region's English.
 *
 * Returns true when the change needs the app reopened, which is iOS only.
 * Android recreates the activity on a reload, so the new direction is picked up
 * there. UIKit reads layout direction once, when the process starts, so a
 * JavaScript reload flips the content and leaves the navigation bar mirrored the
 * old way — a half-turned screen that looks like a bug, because it is one. An
 * app cannot relaunch itself on iOS, so the caller says so instead.
 */
export function chooseLanguage(language: SupportedLanguage): boolean {
  const locale = localeForLanguage(language, deviceLocaleTags())
  const directionChanges = isRightToLeft(locale) !== I18nManager.isRTL

  chooseLocale(locale)
  if (!directionChanges) return false
  if (Platform.OS === 'ios') return true

  // The RTL flags are written by native calls that are still in flight when
  // this returns; reloading at once has been seen to lose the second write.
  // ponytail: a fixed delay rather than a completion signal, which the API
  // does not offer.
  setTimeout(() => void reloadAppAsync('layout direction changed'), RELOAD_DELAY_MS)
  return false
}
