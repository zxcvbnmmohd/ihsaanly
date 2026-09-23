/** Interface locales are region-qualified; content is keyed by language only. */
export const SUPPORTED_LOCALES = [
  'en-CA',
  'en-GB',
  'en-US',
  'ar',
  'fr',
  'it',
  'ja',
  'hi',
  'ur',
  'so',
  'zh-Hans',
  'yue',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-CA'

export const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur']

export function languageOf(locale: string): string {
  return locale.split('-')[0] ?? locale
}

export function isRightToLeft(locale: string): boolean {
  return RTL_LANGUAGES.includes(languageOf(locale))
}

/**
 * A device locale is matched exactly, then by language, then falls back. A
 * language whose content is incomplete is simply not in the supported list.
 */
/**
 * Hong Kong and Macau speak Cantonese, but their devices usually report
 * Chinese with a region rather than `yue`, so they are read as Cantonese.
 * Taiwan also writes Traditional Chinese but speaks Mandarin, and is left alone.
 */
function normalise(tag: string): string {
  return /^zh(-Hant)?-(HK|MO)$/i.test(tag) ? 'yue' : tag
}

export function resolveLocale(preferred: string[]): SupportedLocale {
  preferred = preferred.map(normalise)
  const exact = preferred.find((candidate): candidate is SupportedLocale =>
    SUPPORTED_LOCALES.includes(candidate as SupportedLocale),
  )
  if (exact) return exact

  for (const candidate of preferred) {
    const language = languageOf(candidate)
    const match = SUPPORTED_LOCALES.find((locale) => languageOf(locale) === language)
    if (match) return match
  }

  return DEFAULT_LOCALE
}

/** What the user chooses. The region is the device's business. */
export const SUPPORTED_LANGUAGES = [
  'en',
  'ar',
  'fr',
  'it',
  'ja',
  'hi',
  'ur',
  'so',
  'zh',
  'yue',
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function supportedLanguageOf(locale: SupportedLocale): SupportedLanguage {
  const language = languageOf(locale)
  return SUPPORTED_LANGUAGES.find((candidate) => candidate === language) ?? 'en'
}

/**
 * The first device locale in the chosen language decides the region, exactly
 * when we ship it and by language otherwise. A device with no locale in that
 * language gets the first region we do ship.
 */
export function localeForLanguage(
  language: SupportedLanguage,
  deviceLocales: string[],
): SupportedLocale {
  const inLanguage = deviceLocales.map(normalise).filter((tag) => languageOf(tag) === language)
  const resolved = resolveLocale(inLanguage)
  if (languageOf(resolved) === language) return resolved

  return SUPPORTED_LOCALES.find((locale) => languageOf(locale) === language) ?? DEFAULT_LOCALE
}
