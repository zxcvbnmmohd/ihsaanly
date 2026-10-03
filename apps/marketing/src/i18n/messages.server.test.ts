import { describe, expect, test } from 'bun:test'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import { catalogue, merge } from './messages.server'

describe('catalogue', () => {
  test('English is complete and has nothing missing or unknown', () => {
    const english = catalogue('en')
    expect(english.present).toBe(true)
    expect(english.missing).toEqual([])
    expect(english.unknown).toEqual([])
    expect(english.strings['home.title']).toBeTruthy()
  })

  test('skips _comment notes', () => {
    expect(Object.keys(catalogue('en').strings).some((key) => key.includes('_comment'))).toBe(false)
  })

  test('every language has a file and carries every English key', () => {
    const english = catalogue('en')
    for (const code of SUPPORTED_LANGUAGES) {
      const own = catalogue(code)
      expect(own.present).toBe(true)
      expect(Object.keys(own.strings).sort()).toEqual(Object.keys(english.strings).sort())
      expect(own.unknown).toEqual([])
    }
  })

  test('a translated string wins over English', () => {
    expect(catalogue('fr').strings['notFound.title']).not.toBe(
      catalogue('en').strings['notFound.title'],
    )
  })
})

describe('merge', () => {
  const english = { a: 'one', b: 'two', c: 'three' }

  test('falls back to English for a missing or blank string and reports it', () => {
    const result = merge(english, { a: 'un', b: '  ' }, 'fr')
    expect(result.strings).toEqual({ a: 'un', b: 'two', c: 'three' })
    expect(result.missing).toEqual(['b', 'c'])
    expect(result.unknown).toEqual([])
    expect(result.present).toBe(true)
  })

  test('reports keys English does not have', () => {
    expect(merge(english, { ...english, d: 'four' }, 'fr').unknown).toEqual(['d'])
  })

  test('a language with no file is English throughout', () => {
    const result = merge(english, null, 'fr')
    expect(result.strings).toEqual(english)
    expect(result.missing).toEqual(['a', 'b', 'c'])
    expect(result.present).toBe(false)
  })

  test('English itself never reports anything missing', () => {
    expect(merge(english, { a: 'one', b: '', c: 'three' }, 'en').missing).toEqual([])
  })
})
