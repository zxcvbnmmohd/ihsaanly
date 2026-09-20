import { describe, expect, it } from 'bun:test'

import glossaryDocument from '../../content/glossary.json'
import { termForRuling } from './glossary'
import { GlossaryDocument, Ruling } from './schema'

describe('the glossary', () => {
  it('is valid', () => {
    expect(GlossaryDocument.safeParse(glossaryDocument).success).toBe(true)
  })

  it('explains every ruling the content can carry', () => {
    Ruling.options.forEach((ruling) => expect(termForRuling(ruling)?.id).toBe(ruling))
  })

  it('has every term in both shipped languages', () => {
    glossaryDocument.terms.forEach((term) => {
      expect(Object.keys(term.definition).sort()).toEqual(['ar', 'en'])
    })
  })
})
