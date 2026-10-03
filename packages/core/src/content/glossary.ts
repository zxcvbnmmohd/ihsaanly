import document from '../../content/glossary.json'
import type { GlossaryDocument, GlossaryTerm } from './schema'
import { translationFiles } from './translation-files'
import { applyGlossaryTranslations, type TranslationFile } from './translations'

/**
 * Shape is checked by the content test, so the app does not re-parse it at
 * startup. Live bindings, like `content` in `./index`, which installs a
 * downloaded glossary through `installGlossary`.
 */
export let glossary: GlossaryDocument = applyGlossaryTranslations(
  document as GlossaryDocument,
  translationFiles,
)

export let terms: GlossaryTerm[] = glossary.terms

/** `null` is the shipped glossary. Called by `installContent`, which has already parsed both. */
export function installGlossary(
  next: GlossaryDocument | null,
  translations: TranslationFile[],
): void {
  glossary = applyGlossaryTranslations(next ?? (document as GlossaryDocument), translations)
  terms = glossary.terms
}
