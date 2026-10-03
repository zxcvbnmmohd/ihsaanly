import { describe, expect, test } from 'bun:test'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import {
  absolute,
  allPagePaths,
  BASE_URL,
  formatDate,
  isLocaleCode,
  LOCALES,
  localeFor,
  PAGES,
  pageUrl,
} from './locales'

describe('LOCALES', () => {
  test('has one entry per supported language, English first', () => {
    expect(LOCALES.map((locale) => locale.code)).toEqual([...SUPPORTED_LANGUAGES])
    expect(LOCALES[0]?.code).toBe('en')
  })

  test('announces Cantonese as Traditional Chinese for Hong Kong in hreflang only', () => {
    const yue = localeFor('yue')
    expect(yue.hreflang).toBe('zh-Hant-HK')
    expect(yue.lang).toBe('yue-Hant')
  })

  test('Arabic and Urdu are right-to-left', () => {
    expect(localeFor('ar').dir).toBe('rtl')
    expect(localeFor('ur').dir).toBe('rtl')
    expect(localeFor('fr').dir).toBe('ltr')
  })
})

describe('isLocaleCode', () => {
  test('accepts supported codes only', () => {
    expect(isLocaleCode('fr')).toBe(true)
    expect(isLocaleCode('xx')).toBe(false)
    expect(isLocaleCode(undefined)).toBe(false)
    expect(isLocaleCode(3)).toBe(false)
  })
})

describe('localeFor', () => {
  test('defaults to English', () => {
    expect(localeFor(undefined).code).toBe('en')
  })

  test('throws for an unknown code', () => {
    expect(() => localeFor('xx')).toThrow('Unknown locale "xx"')
  })
})

describe('urls', () => {
  test('English lives at the root, other languages under their code', () => {
    expect(pageUrl(localeFor('en'), '')).toBe('/')
    expect(pageUrl(localeFor('fr'), 'legal/terms/')).toBe('/fr/legal/terms/')
  })

  test('absolute prefixes the site origin', () => {
    expect(absolute('/ar/')).toBe(`${BASE_URL}/ar/`)
  })

  test('allPagePaths covers every page in every language', () => {
    const paths = allPagePaths()
    expect(paths).toHaveLength(Object.keys(PAGES).length * LOCALES.length)
    expect(paths).toContain('/')
    expect(paths).toContain('/yue/legal/delete-account/')
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('formatDate', () => {
  const date = new Date(Date.UTC(2026, 8, 29))

  test('English uses day-month-year', () => {
    expect(formatDate(date, localeFor('en'))).toBe('29 September 2026')
  })

  test('other languages use their own tag, in UTC', () => {
    expect(formatDate(date, localeFor('fr'))).toBe('29 septembre 2026')
  })
})
