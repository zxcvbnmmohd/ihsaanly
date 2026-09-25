// Mirrors src/app/(library)/index.tsx: search by name or situation, grouped by
// category. "On Today" reflects the demo's fixed enabled set (every item with
// `defaultOn: true`, the same set engine.ts hands to `plan()`) since the demo
// has no per-item toggle.

import { items, resolveText } from '@/content'
import { groupByCategory, searchItems } from '@/content/search'
import type { Ruling } from '@/content/schema'
import type { Strings } from '@/strings/en'

export interface LibraryEntry {
  id: string
  title: string
  ruling: Ruling
  onToday: boolean
}

export interface LibrarySectionView {
  category: string
  categoryLabel: string
  entries: LibraryEntry[]
}

export function buildLibrarySections(query: string, strings: Strings): LibrarySectionView[] {
  const matching = searchItems(items, query)
  const labelOf = (category: string): string => strings.category[category] ?? category

  return groupByCategory(matching)
    .map((section) => ({
      category: section.category,
      categoryLabel: labelOf(section.category),
      entries: section.items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        ruling: item.ruling,
        onToday: item.defaultOn,
      })),
    }))
    .sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel))
}
