// Reads the page's own language contract — `data-locale` and `dir` on
// `<html>`, set by the templates that wrap this demo — and turns it into
// everything the phone needs to speak that language the way the app does:
// the matching string table, the content language for `resolveText`, and an
// Intl locale for date formatting. One read at boot; the demo has no
// in-page language switcher, only a theme one, so nothing here needs to
// react to change.

import { setContentLanguage } from '@/content'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/locale'
import { ar } from '@/strings/ar'
import { en, type Strings } from '@/strings/en'
import { fr } from '@/strings/fr'
import { hi } from '@/strings/hi'
import { it } from '@/strings/it'
import { ja } from '@/strings/ja'
import { so } from '@/strings/so'
import { ur } from '@/strings/ur'
import { yue } from '@/strings/yue'
import { zh } from '@/strings/zh'

// Imported directly from each table rather than `@/strings` (which pulls in
// `@/i18n/store`, and through it `expo` and `react-native`) so the browser
// bundle never has to resolve native-only modules.
const STRINGS: Record<SupportedLanguage, Strings> = { en, ar, fr, hi, it, ja, so, ur, yue, zh }

/**
 * The Intl locale the app itself would pass to `Intl.DateTimeFormat` for
 * this language (see `SUPPORTED_LOCALES` in `src/i18n/locale.ts`). The demo
 * has no device region to defer to, so it uses the one locale each language
 * ships under.
 */
const INTL_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  ar: 'ar',
  fr: 'fr',
  hi: 'hi',
  it: 'it',
  ja: 'ja',
  so: 'so',
  ur: 'ur',
  yue: 'yue',
  zh: 'zh-Hans',
}

export interface DemoLocale {
  language: SupportedLanguage
  strings: Strings
  intlLocale: string
  dir: 'ltr' | 'rtl'
}

function languageFromDataset(value: string | undefined): SupportedLanguage {
  return SUPPORTED_LANGUAGES.find((candidate) => candidate === value) ?? 'en'
}

/**
 * Reads `data-locale` and `dir` from `<html>` and sets the content language
 * for `resolveText` (`@/content`) to match, exactly as `chooseLocale` in
 * `src/i18n/store.ts` does for the app itself.
 */
export function readDemoLocale(documentElement: HTMLElement): DemoLocale {
  const language = languageFromDataset(documentElement.dataset.locale)
  setContentLanguage(language)

  return {
    language,
    strings: STRINGS[language],
    intlLocale: INTL_LOCALE[language],
    dir: documentElement.dir === 'rtl' ? 'rtl' : 'ltr',
  }
}
