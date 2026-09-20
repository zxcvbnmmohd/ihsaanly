import type { ReactElement } from 'react'
import { useState } from 'react'

import { items, resolveText } from '@/content'
import { groupByCategory, searchItems } from '@/content/search'
import type { Item } from '@/content/schema'
import { useKnownItems } from '@/memorise/store'
import { useEnabledItems } from '@/plan/enabled-store'
import { LibraryScreen, type LibraryFilter, type LibrarySectionView } from '@/screens/library'
import { useStrings } from '@/strings'

interface Thing {
  query: string
  filter: LibraryFilter
}

function passes(item: Item, filter: LibraryFilter, enabled: string[], known: string[]): boolean {
  if (filter === 'onToday') return enabled.includes(item.id)
  if (filter === 'known') return known.includes(item.id)
  return true
}

export default function LibraryRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '', filter: 'all' })
  const strings = useStrings()
  const enabled = useEnabledItems()
  const known = useKnownItems()

  const matching = searchItems(items, thing.query)
  const labelOf = (category: string): string => strings.category[category] ?? category

  const sections: LibrarySectionView[] = groupByCategory(
    matching.filter((item) => passes(item, thing.filter, enabled, known)),
  )
    .map((section) => ({
      category: section.category,
      entries: section.items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        ruling: item.ruling,
        href: `/item/${item.id}` as const,
        onToday: enabled.includes(item.id),
        known: known.includes(item.id),
      })),
    }))
    .sort((left, right) => labelOf(left.category).localeCompare(labelOf(right.category)))

  return (
    <LibraryScreen
      query={thing.query}
      filter={thing.filter}
      counts={{
        all: matching.length,
        onToday: matching.filter((item) => enabled.includes(item.id)).length,
        known: matching.filter((item) => known.includes(item.id)).length,
      }}
      sections={sections}
      onQueryChange={(query) => setThing((current) => ({ ...current, query }))}
      onFilterChange={(filter) => setThing((current) => ({ ...current, filter }))}
    />
  )
}
