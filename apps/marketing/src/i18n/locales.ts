// The site's languages and URL scheme. English is served at the root and every
// other language under /<code>/, the same URLs the old generator produced.
// The code, direction and native name come from @ihsaanly/core, which the
// app's own Language screen uses too; this file adds only what the site
// itself needs on top: the BCP 47 tag, hreflang and Open Graph locale.

import {
  LOCALE_INFO,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@ihsaanly/core/i18n/locale'

export const BASE_URL = 'https://ihsaanly.app'
export const DONATE_URL = 'https://donate.ihsaanly.app'
export const EMAIL = 'support@ihsaanly.app'
export const LOCALE_KEY = 'ihsaanly.locale'

export interface Locale {
  /** The app's own language code, used in URLs and the message file name. */
  code: LocaleCode
  /** BCP 47 tag for the `lang` attribute. */
  lang: string
  /** Tag for `hreflang`, which only accepts ISO 639-1 languages. */
  hreflang: string
  dir: 'ltr' | 'rtl'
  /** The language's name in itself, as the app's Language screen shows it. */
  name: string
  /** Open Graph locale, language_TERRITORY. */
  og: string
}

export type LocaleCode = SupportedLanguage

// `yue` (Cantonese) has no ISO 639-1 code, and hreflang rejects ISO 639-3, so
// it is announced as Traditional Chinese for Hong Kong. `lang` stays honest.
const SITE_FIELDS: Record<LocaleCode, Pick<Locale, 'lang' | 'hreflang' | 'og'>> = {
  en: { lang: 'en', hreflang: 'en', og: 'en_US' },
  ar: { lang: 'ar', hreflang: 'ar', og: 'ar_AR' },
  fr: { lang: 'fr', hreflang: 'fr', og: 'fr_FR' },
  it: { lang: 'it', hreflang: 'it', og: 'it_IT' },
  ja: { lang: 'ja', hreflang: 'ja', og: 'ja_JP' },
  hi: { lang: 'hi', hreflang: 'hi', og: 'hi_IN' },
  ur: { lang: 'ur', hreflang: 'ur', og: 'ur_PK' },
  so: { lang: 'so', hreflang: 'so', og: 'so_SO' },
  zh: { lang: 'zh-Hans', hreflang: 'zh-Hans', og: 'zh_CN' },
  yue: { lang: 'yue-Hant', hreflang: 'zh-Hant-HK', og: 'zh_HK' },
}

export const LOCALES: readonly Locale[] = LOCALE_INFO.map((info) => ({
  code: info.code,
  dir: info.dir,
  name: info.nativeName,
  ...SITE_FIELDS[info.code],
}))

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function localeFor(code: string | undefined): Locale {
  const found = LOCALES.find((locale) => locale.code === (code ?? 'en'))
  if (!found) throw new Error(`Unknown locale "${code}"`)
  return found
}

export type PageId = 'home' | 'privacy' | 'terms'

export interface Page {
  id: PageId
  /** Path under the locale's root, '' for the home page. */
  path: string
  titleKey: string
  descriptionKey: string
  /** Legal pages carry a date, formatted per language. */
  updated?: Date
}

export const PAGES: Record<PageId, Page> = {
  home: { id: 'home', path: '', titleKey: 'home.title', descriptionKey: 'home.description' },
  privacy: {
    id: 'privacy',
    path: 'legal/privacy/',
    titleKey: 'privacy.pageTitle',
    descriptionKey: 'privacy.description',
    updated: new Date(Date.UTC(2026, 8, 25)),
  },
  terms: {
    id: 'terms',
    path: 'legal/terms/',
    titleKey: 'terms.pageTitle',
    descriptionKey: 'terms.description',
    updated: new Date(Date.UTC(2026, 8, 25)),
  },
}

function localePrefix(locale: Locale): string {
  return locale.code === 'en' ? '/' : `/${locale.code}/`
}

export function pageUrl(locale: Locale, path: string): string {
  return `${localePrefix(locale)}${path}`
}

export function absolute(path: string): string {
  return `${BASE_URL}${path}`
}

/** Every prerendered page path: 10 languages × 3 pages. */
export function allPagePaths(): string[] {
  return Object.values(PAGES).flatMap((page) => LOCALES.map((locale) => pageUrl(locale, page.path)))
}

export function formatDate(date: Date, locale: Locale): string {
  // English keeps the site's own day-month-year order.
  const tag = locale.code === 'en' ? 'en-GB' : locale.lang
  return new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
