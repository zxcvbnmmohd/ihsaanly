// The app's content, read straight from packages/core/content/items.json
// (the JSON import @ihsaanly/core/content uses does not load under
// Playwright's Node loader), so the specs match the exact text shown.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface Item {
  id: string
  arabic: string
  title: Record<string, string>
  transliteration: Record<string, string> | null
  translation: Record<string, string> | null
}

const FILE = join(import.meta.dirname, '..', '..', 'packages', 'core', 'content', 'items.json')
const ITEMS = (JSON.parse(readFileSync(FILE, 'utf8')) as { items: Item[] }).items

/** One item's text in English. */
export function contentItem(id: string): {
  title: string
  arabic: string
  transliteration: string
  translation: string
} {
  const item = ITEMS.find((each) => each.id === id)
  if (!item) throw new Error(`${id} is not in items.json`)
  return {
    title: item.title.en ?? '',
    arabic: item.arabic,
    transliteration: item.transliteration?.en ?? '',
    translation: item.translation?.en ?? '',
  }
}
