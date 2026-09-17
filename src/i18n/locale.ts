/** Interface locales are region-qualified; content is keyed by language only. */
export const SUPPORTED_LOCALES = ['en-CA', 'en-GB', 'en-US', 'ar'] as const

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
export function resolveLocale(preferred: string[]): SupportedLocale {
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
