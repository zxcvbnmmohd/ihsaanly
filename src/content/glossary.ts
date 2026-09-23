import document from '../../content/glossary.json'
import type { GlossaryDocument, GlossaryTerm } from './schema'
import { translationFiles } from './translation-files'
import { applyGlossaryTranslations } from './translations'

/** Shape is checked by the content test, so the app does not re-parse it at startup. */
export const glossary = applyGlossaryTranslations(document as GlossaryDocument, translationFiles)

export const terms: GlossaryTerm[] = glossary.terms
