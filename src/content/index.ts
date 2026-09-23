import document from '../../content/items.json'
import type { ContentDocument, Item } from './schema'
import { translationFiles } from './translation-files'
import { applyTranslations } from './translations'

/**
 * Shape is guaranteed by the build gate, so the app does not re-parse the
 * document at startup. Every language but English is laid over it here.
 */
export const content = applyTranslations(document as ContentDocument, translationFiles)

export const items = content.items

export function itemById(id: string): Item | undefined {
  return items.find((item) => item.id === id)
}

let currentLanguage = 'en'

/** Set once at startup from the chosen locale; content is keyed by language. */
export function setContentLanguage(language: string): void {
  currentLanguage = language
}

export function resolveText(
  field: Record<string, string> | null | undefined,
  locale: string = currentLanguage,
): string | null {
  if (!field) return null
  const language = locale.split('-')[0] ?? locale
  return field[locale] ?? field[language] ?? null
}
