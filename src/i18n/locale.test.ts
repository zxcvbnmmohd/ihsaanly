import { describe, expect, it } from 'bun:test'

import { DEFAULT_LOCALE, isRightToLeft, languageOf, resolveLocale } from './locale'

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
