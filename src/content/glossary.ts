import document from '../../content/glossary.json'
import type { GlossaryDocument, GlossaryTerm } from './schema'

/** Shape is checked by the content test, so the app does not re-parse it at startup. */
export const glossary = document as GlossaryDocument

export const terms: GlossaryTerm[] = glossary.terms
