// The site's languages and URL scheme. English is served at the root and every
// other language under /<code>/, the same URLs the old generator produced.

export const BASE_URL = 'https://ihsaanly.app'
export const DONATE_URL = 'https://donate.ihsaanly.app'
export const EMAIL = 'support@ihsaanly.app'
export const THEME_KEY = 'ihsaanly.theme'
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

export const LOCALE_CODES = ['en', 'ar', 'fr', 'it', 'ja', 'hi', 'ur', 'so', 'zh', 'yue'] as const
export type LocaleCode = (typeof LOCALE_CODES)[number]

// `yue` (Cantonese) has no ISO 639-1 code, and hreflang rejects ISO 639-3, so
// it is announced as Traditional Chinese for Hong Kong. `lang` stays honest.
export const LOCALES: readonly Locale[] = [
  { code: 'en', lang: 'en', hreflang: 'en', dir: 'ltr', name: 'English', og: 'en_US' },
  { code: 'ar', lang: 'ar', hreflang: 'ar', dir: 'rtl', name: 'العربية', og: 'ar_AR' },
  { code: 'fr', lang: 'fr', hreflang: 'fr', dir: 'ltr', name: 'Français', og: 'fr_FR' },
  { code: 'it', lang: 'it', hreflang: 'it', dir: 'ltr', name: 'Italiano', og: 'it_IT' },
  { code: 'ja', lang: 'ja', hreflang: 'ja', dir: 'ltr', name: '日本語', og: 'ja_JP' },
  { code: 'hi', lang: 'hi', hreflang: 'hi', dir: 'ltr', name: 'हिन्दी', og: 'hi_IN' },
  { code: 'ur', lang: 'ur', hreflang: 'ur', dir: 'rtl', name: 'اردو', og: 'ur_PK' },
  { code: 'so', lang: 'so', hreflang: 'so', dir: 'ltr', name: 'Soomaali', og: 'so_SO' },
  {
    code: 'zh',
    lang: 'zh-Hans',
    hreflang: 'zh-Hans',
    dir: 'ltr',
    name: '中文（普通话）',
    og: 'zh_CN',
  },
  {
    code: 'yue',
    lang: 'yue-Hant',
    hreflang: 'zh-Hant-HK',
    dir: 'ltr',
    name: '廣東話',
    og: 'zh_HK',
  },
]

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value)
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
