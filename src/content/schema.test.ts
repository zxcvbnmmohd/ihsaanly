import { describe, expect, it } from 'bun:test'

import shippedDocument from '../../content/items.json'
import { validateContentDocument } from './validate'

type Fixture = Record<string, unknown>

const hadithFrom = (collection: string, gradedBy: string | null): Fixture => ({
  type: 'hadith',
  collection,
  reference: '1',
  grading: 'sahih',
  gradedBy,
  text: { en: 'narration' },
})

interface TestDocument {
  schemaVersion: number
  reviewedBy: string | null
  audioReciter: string | null
  contentLanguages: string[]
  translationSources: Record<string, string | null>
  items: Fixture[]
}

const documentWith = (evidence: unknown, overrides: Fixture = {}): TestDocument => ({
  schemaVersion: 1,
  reviewedBy: 'A Reviewer',
  audioReciter: null,
  contentLanguages: ['en'],
  translationSources: { en: 'A Translation' },
  items: [
    {
      id: 'an-item',
      category: 'home',
      title: { en: 'An item' },
      ruling: 'sunnah',
      arabic: 'نص',
      transliteration: null,
      translation: { en: 'A translation' },
      repeat: 1,
      evidence: [evidence],
      trigger: { kind: 'event', event: 'leaving-home' },
      defaultOn: true,
      note: null,
      why: null,
      reminder: null,
      how: [],
      reviewed: true,
      audio: null,
      audioTranslation: null,
      ...overrides,
    },
  ],
})

describe('the shipped content document', () => {
  it('is valid', () => {
    const result = validateContentDocument(shippedDocument)
    expect(result.valid ? [] : result.problems).toEqual([])
  })
})

describe('the grading gate', () => {
  it('rejects a collection that does not carry its own grading when no grader is named', () => {
    const result = validateContentDocument(documentWith(hadithFrom('Sunan Abi Dawud', null)))

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.problems.join()).toContain('must name a grader')
  })

  it('accepts the same collection once a grader is named', () => {
    expect(
      validateContentDocument(documentWith(hadithFrom('Sunan Abi Dawud', 'al-Albani'))).valid,
    ).toBe(true)
  })

  it('accepts Bukhari and Muslim with no named grader', () => {
    expect(validateContentDocument(documentWith(hadithFrom('Sahih al-Bukhari', null))).valid).toBe(
      true,
    )
    expect(validateContentDocument(documentWith(hadithFrom('Sahih Muslim', null))).valid).toBe(true)
  })

  it('does not ask for a grader on Qur’an evidence', () => {
    const quran = { type: 'quran', surah: 2, ayah: 255, text: { en: 'verse' } }
    expect(validateContentDocument(documentWith(quran)).valid).toBe(true)
  })
})

describe('document integrity', () => {
  it('rejects text in a language the document does not declare', () => {
    const result = validateContentDocument(
      documentWith(hadithFrom('Sahih Muslim', null), {
        title: { en: 'An item', fr: 'Un article' },
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.problems.join()).toContain('not declared')
  })

  it('rejects duplicate item ids', () => {
    const base = documentWith(hadithFrom('Sahih Muslim', null))
    const result = validateContentDocument({ ...base, items: [...base.items, ...base.items] })

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.problems.join()).toContain('duplicate item id')
  })

  it('rejects an item with no evidence at all', () => {
    const base = documentWith(hadithFrom('Sahih Muslim', null))
    const result = validateContentDocument({
      ...base,
      items: [{ ...base.items[0], evidence: [] }],
    })

    expect(result.valid).toBe(false)
  })
})

describe('release warnings', () => {
  it('warns when content has not been reviewed', () => {
    const base = documentWith(hadithFrom('Sahih Muslim', null))
    const result = validateContentDocument({ ...base, reviewedBy: null })

    expect(result.valid && result.warnings.join()).toContain('cannot be released unreviewed')
  })
})

describe('parts', () => {
  const part = (id: string, overrides: Fixture = {}): Fixture => ({
    id,
    title: { en: 'A part' },
    arabic: 'نص',
    transliteration: null,
    translation: { en: 'A translation' },
    repeat: 3,
    evidence: [hadithFrom('Sahih Muslim', null)],
    ...overrides,
  })

  const withParts = (parts: Fixture[]): TestDocument =>
    documentWith(hadithFrom('Sahih Muslim', null), { parts })

  it('accepts an item with ordered parts', () => {
    expect(validateContentDocument(withParts([part('one'), part('two')])).valid).toBe(true)
  })

  it('rejects duplicate part ids within an item', () => {
    const result = validateContentDocument(withParts([part('one'), part('one')]))

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.problems.join()).toContain('duplicate part id')
  })

  it('rejects a part with no Arabic', () => {
    expect(validateContentDocument(withParts([part('one', { arabic: '' })])).valid).toBe(false)
  })

  it('holds part evidence to the same grading gate', () => {
    const result = validateContentDocument(
      withParts([part('one', { evidence: [hadithFrom('Sunan Abi Dawud', null)] })]),
    )

    expect(result.valid).toBe(false)
    expect(result.valid === false && result.problems.join()).toContain('must name a grader')
  })

  it('rejects part text in an undeclared language', () => {
    const result = validateContentDocument(
      withParts([part('one', { title: { en: 'A part', fr: 'Une partie' } })]),
    )

    expect(result.valid).toBe(false)
  })

  it('gives the shipped morning and evening adhkar their texts', () => {
    const result = validateContentDocument(shippedDocument)
    const ids = ['morning-adhkar', 'evening-adhkar']
    const parts = result.valid
      ? ids.map((id) => result.document.items.find((item) => item.id === id)?.parts?.length ?? 0)
      : []

    expect(parts).toHaveLength(2)
    expect(parts.every((count) => count > 0)).toBe(true)
  })
})
