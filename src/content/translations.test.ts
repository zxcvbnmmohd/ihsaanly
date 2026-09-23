import { describe, expect, it } from 'bun:test'

import { content } from '.'
import document from '../../content/items.json'
import type { ContentDocument } from './schema'
import { applyTranslations, missingIn } from './translations'

const english = document as ContentDocument
const first = english.items[0]

describe('laying a translation over the English content', () => {
  it('fills a field the language lacks', () => {
    if (!first) throw new Error('no items')
    const merged = applyTranslations(english, [
      { language: 'fr', items: { [first.id]: { title: 'Titre' } }, glossary: {} },
    ])
    expect(merged.items[0]?.title.fr).toBe('Titre')
    expect(merged.contentLanguages).toContain('fr')
  })

  it('never overwrites text items.json already carries', () => {
    if (!first) throw new Error('no items')
    const merged = applyTranslations(english, [
      { language: 'en', items: { [first.id]: { title: 'Replaced' } }, glossary: {} },
    ])
    expect(merged.items[0]?.title.en).toBe(first.title.en)
  })

  it('falls back to the English transliteration, which is a romanisation', () => {
    const withTransliteration = english.items.find((item) => item.transliteration?.en)
    const merged = applyTranslations(english, [{ language: 'ja', items: {}, glossary: {} }])
    const same = merged.items.find((item) => item.id === withTransliteration?.id)
    expect(same?.transliteration?.ja).toBe(withTransliteration?.transliteration?.en)
  })

  it('asks Arabic for no translation of Arabic', () => {
    expect(missingIn(content, 'ar').some((path) => path.endsWith('.translation'))).toBe(false)
  })
})
