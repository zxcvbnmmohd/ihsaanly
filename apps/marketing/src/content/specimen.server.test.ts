import { describe, expect, test } from 'bun:test'
import { catalogue } from '~/i18n/messages.server'
import { specimenDuas } from './specimen.server'

describe('specimenDuas', () => {
  test('English: three real duas with Arabic, transliteration, meaning and source', () => {
    const duas = specimenDuas('en', catalogue('en').strings)
    expect(duas).toHaveLength(3)
    for (const dua of duas) {
      expect(dua.arabic).toMatch(/[؀-ۿ]/)
      expect(dua.transliteration).not.toBe('')
      expect(dua.translation).toBeTruthy()
      expect(dua.title).toBeTruthy()
      expect(dua.titleLang).toBeNull()
      expect(dua.source).toBeTruthy()
    }
  })

  test('the grading shows only on the duas that have one', () => {
    const duas = specimenDuas('en', catalogue('en').strings)
    expect(duas.map((dua) => dua.grading !== '')).toEqual([true, true, false])
  })

  test('a translated language uses its own title and meaning', () => {
    const [english] = specimenDuas('en', catalogue('en').strings)
    const [french] = specimenDuas('fr', catalogue('fr').strings)
    expect(french?.arabic).toBe(english?.arabic ?? '')
    expect(french?.translation).not.toBe(english?.translation)
    expect(french?.title).not.toBe(english?.title)
  })

  test('Arabic has no translation by design', () => {
    expect(
      specimenDuas('ar', catalogue('ar').strings).every((dua) => dua.translation === null),
    ).toBe(true)
  })

  test('every language has its own titles, so none falls back to English', () => {
    for (const code of ['ar', 'fr', 'ja', 'zh', 'yue'] as const) {
      const duas = specimenDuas(code, catalogue(code).strings)
      expect(duas.every((dua) => dua.titleLang === null && dua.title !== '')).toBe(true)
    }
  })

  test('an absent string table entry throws', () => {
    expect(() => specimenDuas('en', {})).toThrow('Unknown string')
  })
})
