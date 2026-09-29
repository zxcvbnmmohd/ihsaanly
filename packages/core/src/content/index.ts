import document from '../../content/items.json'
import type { ContentDocument, Item } from './schema'
import { translationFiles } from './translation-files'
import { applyTranslations } from './translations'

export { resolveText, setContentLanguage } from './language'

/**
 * Shape is guaranteed by the build gate, so the app does not re-parse the
 * document at startup. Every language but English is laid over it here.
 */
export const content = applyTranslations(document as ContentDocument, translationFiles)

export const items = content.items

export function itemById(id: string): Item | undefined {
  return items.find((item) => item.id === id)
}
