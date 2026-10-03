import { afterEach, describe, expect, it } from 'bun:test'

import glossaryDocument from '../../content/glossary.json'
import itemsDocument from '../../content/items.json'
import { glossary, terms } from './glossary'
import {
  content,
  installContent,
  itemById,
  items,
  parseContent,
  resetContent,
  resolveText,
  setContentLanguage,
  shippedContentFingerprint,
} from './index'
import type { ContentDocument } from './schema'

describe('the content index', () => {
  it('exposes the translated document and its items', () => {
    expect(items).toBe(content.items)
    expect(items.length).toBeGreaterThan(0)
    expect(content.contentLanguages).toContain('ar')
  })

  it('finds an item by id, and nothing for an unknown id', () => {
    const [first] = items
    if (!first) throw new Error('no items')
    expect(itemById(first.id)).toBe(first)
    expect(itemById('no-such-item')).toBeUndefined()
  })

  it('re-exports the language lookup', () => {
    const [first] = items
    if (!first) throw new Error('no items')
    setContentLanguage('en')
    expect(resolveText(first.title)).toBe(first.title.en ?? null)
  })
})

describe('installing downloaded content', () => {
  const english = itemsDocument as unknown as ContentDocument
  const [firstItem] = english.items
  if (!firstItem) throw new Error('no items')

  const renamed = {
    ...english,
    items: english.items.map((item) =>
      item.id === firstItem.id ? { ...item, title: { ...item.title, en: 'A new title' } } : item,
    ),
  }
  const french = {
    language: 'fr',
    items: { [firstItem.id]: { title: 'Un titre neuf' } },
    glossary: {},
  }

  afterEach(() => resetContent())

  it('replaces the live bindings, with the downloaded translation over the shipped one', () => {
    const before = items
    expect(
      installContent({ items: renamed, glossary: glossaryDocument, translations: [french] }),
    ).toBe(true)

    expect(items).not.toBe(before)
    expect(items).toBe(content.items)
    expect(itemById(firstItem.id)?.title.en).toBe('A new title')
    expect(itemById(firstItem.id)?.title.fr).toBe('Un titre neuf')
    // A language the download did not carry keeps the shipped translation.
    expect(itemById(firstItem.id)?.title.ar).toBe(firstItem.title.ar ?? '')
    expect(content.contentLanguages).toContain('ja')
  })

  it('installs the glossary too, for the importers of ./glossary', () => {
    const [term] = glossaryDocument.terms
    if (!term) throw new Error('no terms')
    const changed = {
      ...glossaryDocument,
      terms: glossaryDocument.terms.map((each) =>
        each.id === term.id ? { ...each, term: { ...each.term, en: 'Changed' } } : each,
      ),
    }
    installContent({ items: english, glossary: changed, translations: [] })
    expect(terms.find((each) => each.id === term.id)?.term.en).toBe('Changed')
    expect(glossary.terms).toBe(terms)

    resetContent()
    expect(terms.find((each) => each.id === term.id)?.term.en).toBe(term.term.en)
  })

  it('changes nothing when any part fails its schema', () => {
    const before = items
    const bad = [
      { items: { ...english, schemaVersion: 2 }, glossary: glossaryDocument, translations: [] },
      { items: english, glossary: { terms: 'none' }, translations: [] },
      { items: english, glossary: glossaryDocument, translations: [{ language: 'French' }] },
      { items: null, glossary: null, translations: [] },
    ]
    bad.forEach((input) => {
      expect(parseContent(input)).toBeNull()
      expect(installContent(input)).toBe(false)
    })
    expect(items).toBe(before)
  })

  it('goes back to the shipped content', () => {
    installContent({ items: renamed, glossary: glossaryDocument, translations: [] })
    resetContent()
    expect(itemById(firstItem.id)?.title.en).toBe(firstItem.title.en ?? '')
  })
})

describe('the shipped content fingerprint', () => {
  it('is stable for one build', () => {
    const first = shippedContentFingerprint()
    expect(first).toMatch(/^[0-9a-f]{8}-\d+$/)
    expect(shippedContentFingerprint()).toBe(first)
  })
})
