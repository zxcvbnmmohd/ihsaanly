import type { Item } from './schema'

export interface LibrarySection {
  category: string
  items: Item[]
}

function haystack(item: Item): string {
  return [
    item.id,
    item.category,
    ...Object.values(item.title),
    ...Object.values(item.transliteration ?? {}),
    ...Object.values(item.translation ?? {}),
  ]
    .join(' ')
    .toLowerCase()
}

/** Matches on name or on situation, so "travel" finds the journey duas. */
export function searchItems(items: Item[], query: string): Item[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return items

  return items.filter((item) => {
    const text = haystack(item)
    return terms.every((term) => text.includes(term))
  })
}

export function groupByCategory(items: Item[]): LibrarySection[] {
  const sections = new Map<string, Item[]>()

  items.forEach((item) => {
    const existing = sections.get(item.category)
    if (existing) existing.push(item)
    else sections.set(item.category, [item])
  })

  return [...sections.entries()]
    .map(([category, grouped]) => ({ category, items: grouped }))
    .sort((left, right) => left.category.localeCompare(right.category))
}
