import { describe, expect, it } from 'bun:test'

import glossaryDocument from '../../content/glossary.json'
import { terms } from './glossary'
import { GlossaryDocument, Ruling } from './schema'

describe('the glossary', () => {
  it('is valid', () => {
    expect(GlossaryDocument.safeParse(glossaryDocument).success).toBe(true)
  })

  it('explains every ruling the content can carry', () => {
    const ids = new Set(terms.map((term) => term.id))
    Ruling.options.forEach((ruling) => expect(ids.has(ruling)).toBe(true))
  })

  it('has every term in both shipped languages', () => {
    glossaryDocument.terms.forEach((term) => {
      expect(Object.keys(term.definition).sort()).toEqual(['ar', 'en'])
    })
  })
})
