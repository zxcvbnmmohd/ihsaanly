import { describe, expect, it } from 'bun:test'

import { TranslationFile } from '../content/translations'
import { en } from '../strings/en'

import { loadLanguagePack } from './language-pack'
import { SUPPORTED_LANGUAGES } from './locale'

describe('loadLanguagePack', () => {
  it('gives English its own table and no translation file', async () => {
    const pack = await loadLanguagePack('en')
    expect(pack).toEqual({ language: 'en', strings: en, translation: null })
  })

  it.each(SUPPORTED_LANGUAGES.filter((language) => language !== 'en'))(
    'pairs %s with its string table and a matching, valid translation file',
    async (language) => {
      const pack = await loadLanguagePack(language)
      expect(pack.language).toBe(language)
      expect(pack.strings.tabs.today.length).toBeGreaterThan(0)
      expect(pack.strings.tabs.today).not.toBe(en.tabs.today)
      expect(pack.translation?.language).toBe(language)
      expect(TranslationFile.safeParse(pack.translation).success).toBe(true)
    },
  )
})
