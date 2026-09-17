import type { ReactElement } from 'react'
import { useState } from 'react'

import { items, resolveText } from '@/content'
import { groupByCategory, searchItems } from '@/content/search'
import { LibraryScreen, type LibrarySectionView } from '@/screens/library'

interface Thing {
  query: string
}

export default function LibraryRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '' })

  const sections: LibrarySectionView[] = groupByCategory(searchItems(items, thing.query)).map(
    (section) => ({
      category: section.category,
      entries: section.items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        ruling: item.ruling,
        href: `/item/${item.id}`,
      })),
    }),
  )

  return (
    <LibraryScreen
      query={thing.query}
      sections={sections}
      onQueryChange={(query) => setThing({ query })}
    />
  )
}
