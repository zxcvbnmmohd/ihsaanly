import document from '../../content/glossary.json'
import type { GlossaryDocument, GlossaryTerm, Ruling } from './schema'

/** Shape is checked by the content test, so the app does not re-parse it at startup. */
export const glossary = document as GlossaryDocument

export const terms: GlossaryTerm[] = glossary.terms

export function termById(id: string): GlossaryTerm | undefined {
  return terms.find((term) => term.id === id)
}

/** Every ruling label is a glossary term of the same id, so a tap on one can explain it. */
export function termForRuling(ruling: Ruling): GlossaryTerm | undefined {
  return termById(ruling)
}
