import { describe, expect, it } from 'bun:test'

import {
  DEFAULT_LOCALE,
  isRightToLeft,
  languageOf,
  localeForLanguage,
  resolveLocale,
  supportedLanguageOf,
} from './locale'

describe('resolving a locale', () => {
  it('prefers an exact match', () => {
    expect(resolveLocale(['en-GB'])).toBe('en-GB')
  })

  it('falls back to the same language in another region', () => {
    expect(resolveLocale(['en-AU'])).toBe('en-CA')
  })

  it('falls back to the default when nothing matches', () => {
    expect(resolveLocale(['ja-JP'])).toBe(DEFAULT_LOCALE)
  })

  it('takes the first preference that can be served', () => {
    expect(resolveLocale(['ja-JP', 'ar'])).toBe('ar')
  })

  it('handles an empty preference list', () => {
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE)
  })
})

describe('direction', () => {
  it('knows Arabic reads right to left', () => {
    expect(isRightToLeft('ar')).toBe(true)
  })

  it('knows English does not', () => {
    expect(isRightToLeft('en-CA')).toBe(false)
  })

  it('reads the language out of a region-qualified locale', () => {
    expect(languageOf('en-CA')).toBe('en')
    expect(languageOf('ar')).toBe('ar')
  })
})

describe('choosing a language', () => {
  it("takes the device's own English when we ship it", () => {
    expect(localeForLanguage('en', ['en-GB', 'fr-FR'])).toBe('en-GB')
  })

  it('falls back to a shipped English for an unshipped region', () => {
    expect(localeForLanguage('en', ['en-AU'])).toBe('en-CA')
  })

  it('ignores device locales in other languages', () => {
    expect(localeForLanguage('en', ['fr-FR', 'en-US'])).toBe('en-US')
  })

  it('still finds English on a device with none', () => {
    expect(localeForLanguage('en', ['ja-JP'])).toBe('en-CA')
  })

  it('finds Arabic on a device with only English', () => {
    expect(localeForLanguage('ar', ['en-US'])).toBe('ar')
  })

  it('reduces a stored locale to the language the user picked', () => {
    expect(supportedLanguageOf('en-GB')).toBe('en')
    expect(supportedLanguageOf('ar')).toBe('ar')
  })
})
