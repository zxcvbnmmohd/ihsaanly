// The demo's own view of the content: the English document with only the
// page's language laid over it, instead of `@ihsaanly/core/content`, which
// lays all nine translations over it at import. The app keeps using that.

import document from '@ihsaanly/core/content/items.json'
import type { ContentDocument, Item } from '@ihsaanly/core/content/schema'
import { applyTranslations, type TranslationFile } from '@ihsaanly/core/content/translations'

const english = document as ContentDocument

let applied: TranslationFile | null = null
let active: ContentDocument = english

/** Lays `file` over the English content; idempotent for the same file. */
export function applyDemoTranslation(file: TranslationFile | null): void {
  if (file === applied) return
  applied = file
  active = file ? applyTranslations(english, [file]) : english
}

export function demoItems(): Item[] {
  return active.items
}

export function demoItemById(id: string): Item | undefined {
  return active.items.find((item) => item.id === id)
}
