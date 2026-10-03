import { describe, expect, it } from 'bun:test'
import document from '../../content/items.json'
import { content } from '.'
import type { ContentDocument, GlossaryDocument } from './schema'
import { applyGlossaryTranslations, applyTranslations, missingIn } from './translations'

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

describe('applyGlossaryTranslations', () => {
  const glossary = {
    terms: [
      { id: 'fard', term: { en: 'Fard' }, definition: { en: 'Obligatory' } },
      { id: 'sunnah', term: { en: 'Sunnah', fr: 'Sunna' }, definition: { en: 'Practice' } },
    ],
  } as unknown as GlossaryDocument

  it('fills only the languages and fields a term lacks', () => {
    const merged = applyGlossaryTranslations(glossary, [
      {
        language: 'fr',
        items: {},
        glossary: {
          fard: { term: 'Fard', definition: 'Obligatoire' },
          sunnah: { term: 'Remplacée', definition: 'Pratique' },
        },
      },
    ])
    expect(merged.terms[0]?.definition).toEqual({ en: 'Obligatory', fr: 'Obligatoire' })
    expect(merged.terms[1]?.term).toEqual({ en: 'Sunnah', fr: 'Sunna' })
    expect(merged.terms[1]?.definition.fr).toBe('Pratique')
  })

  it('leaves a term alone when the file has nothing for it', () => {
    const merged = applyGlossaryTranslations(glossary, [
      { language: 'ja', items: {}, glossary: {} },
    ])
    expect(merged.terms).toEqual(glossary.terms)
  })
})

describe('multi-part items', () => {
  const withParts = english.items.find((item) => item.parts?.length)
  const part = withParts?.parts?.[0]

  it('fills a part from its own translation entry, by part id', () => {
    if (!withParts || !part) throw new Error('no multi-part item')
    const merged = applyTranslations(english, [
      {
        language: 'fr',
        items: {
          [withParts.id]: { parts: { [part.id]: { title: 'Partie', translation: 'Verset' } } },
        },
        glossary: {},
      },
    ])
    const mergedPart = merged.items.find((item) => item.id === withParts.id)?.parts?.[0]
    expect(mergedPart?.title.fr).toBe('Partie')
    expect(mergedPart?.translation?.fr).toBe('Verset')
  })

  it('reports each missing part field as item.parts.<id>.<field>, until translated', () => {
    if (!withParts || !part) throw new Error('no multi-part item')
    const missing = missingIn(english, 'fr')
    expect(missing).toContain(`${withParts.id}.parts.${part.id}.title`)
    expect(missing).toContain(`${withParts.id}.parts.${part.id}.translation`)
    expect(missing).toContain(`${english.items[0]?.id}.title`)

    const merged = applyTranslations(english, [
      {
        language: 'fr',
        items: {
          [withParts.id]: { parts: { [part.id]: { title: 'Partie', translation: 'Verset' } } },
        },
        glossary: {},
      },
    ])
    const after = missingIn(merged, 'fr')
    expect(after).not.toContain(`${withParts.id}.parts.${part.id}.title`)
    expect(after).not.toContain(`${withParts.id}.parts.${part.id}.translation`)
  })

  it('asks Arabic for no part translation either', () => {
    expect(
      missingIn(english, 'ar').some(
        (path) => path.includes('.parts.') && path.endsWith('.translation'),
      ),
    ).toBe(false)
  })
})
