import { setContentLanguage } from '@ihsaanly/core/content'
import {
  languageOf,
  localeForLanguage,
  resolveLocale,
  SUPPORTED_LOCALES,
  type SupportedLanguage,
  type SupportedLocale,
} from '@ihsaanly/core/i18n/locale'
import { z } from 'zod'
import { notifyContentForeground } from '../content/updater'
import { createPreferenceStore } from '../storage/preference-store'
import { deviceLocaleTags } from './device'
import { applyDirection } from './direction'

const Locale = z.enum(SUPPORTED_LOCALES)

function deviceLocale(): SupportedLocale {
  return resolveLocale(deviceLocaleTags())
}

const store = createPreferenceStore<SupportedLocale>('locale', Locale, deviceLocale())

export const setLocale = store.set
export const useLocale = store.use
export const getLocale = store.get

/** Persist the choice and switch content; direction is `applyDirection`'s job. */
function chooseLocale(locale: SupportedLocale): void {
  setLocale(locale)
  setContentLanguage(languageOf(locale))
  // Fetches this language's downloaded translation for the next open.
  notifyContentForeground()
}

/**
 * The user picks a language; the device decides which region's English.
 * Returns true when the change needs the app reopened by hand — see
 * `applyDirection`, which decides that and, on platforms that can, reloads
 * for it.
 */
export function chooseLanguage(language: SupportedLanguage): boolean {
  const locale = localeForLanguage(language, deviceLocaleTags())
  chooseLocale(locale)
  return applyDirection(locale)
}
