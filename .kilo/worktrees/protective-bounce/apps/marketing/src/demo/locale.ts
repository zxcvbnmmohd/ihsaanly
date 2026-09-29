// Turns the page's own language — `useSite().locale.code`, sourced from the
// route params rather than `<html data-locale>` as the old vanilla demo read
// it — into everything the phone needs to speak that language the way the
// app does: the matching string table, the content language for
// `resolveText`, an Intl locale for date formatting, and this demo's own
// copy (More tab body, coach bubbles). The page has no in-page language
// switcher, so this is cheap to call fresh on every render.

import { setContentLanguage } from '@ihsaanly/core/content/language'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import type { Strings } from '@ihsaanly/core/strings/en'
import { applyDemoTranslation } from './demo-content'
import { type DemoCopy, demoCopyFor } from './demo-strings'
import type { LanguagePack } from './language-pack'

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
  copy: DemoCopy
}

/**
 * Builds everything the phone needs from the page language's `pack` (see
 * language-pack.ts, which fetched only that language's string table and
 * content translation), lays the translation over the demo's content, and
 * sets the language as the active one for `resolveText`, exactly as
 * `chooseLocale` in `src/i18n/store.ts` does for the app itself. Safe to call
 * on every render: both are idempotent writes to module-level variables, and
 * the phone only ever renders inside `<ClientOnly>`, so it never races an SSR
 * pass or a second locale.
 */
export function demoLocaleFor(pack: LanguagePack): DemoLocale {
  const { language } = pack
  setContentLanguage(language)
  applyDemoTranslation(pack.translation)
  return {
    language,
    strings: pack.strings,
    intlLocale: INTL_LOCALE[language],
    copy: demoCopyFor(language),
  }
}
