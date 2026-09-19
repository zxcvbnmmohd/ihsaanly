import { getLocales } from 'expo-localization'
import { I18nManager } from 'react-native'
import { z } from 'zod'

import { setContentLanguage } from '@/content'
import { createPreferenceStore } from '@/storage/preference-store'

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

function deviceLocaleTags(): string[] {
  return getLocales().map((locale) => locale.languageTag)
}

function deviceLocale(): SupportedLocale {
  return resolveLocale(deviceLocaleTags())
}

const store = createPreferenceStore<SupportedLocale>('locale', Locale, deviceLocale())

export const setLocale = store.set
export const useLocale = store.use
export const getLocale = store.get

/**
 * Layout direction is a native setting that only takes effect on restart, so
 * this asks for it and the change lands next launch. Every style already uses
 * logical directions, so nothing else has to move.
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

/** The user picks a language; the device decides which region's English. */
export function chooseLanguage(language: SupportedLanguage): void {
  chooseLocale(localeForLanguage(language, deviceLocaleTags()))
}
