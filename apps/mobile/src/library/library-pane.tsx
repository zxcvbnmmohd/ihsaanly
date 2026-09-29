import { items, resolveText } from '@ihsaanly/core/content'
import { groupByCategory, searchItems } from '@ihsaanly/core/content/search'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import { useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { useStrings } from '@ihsaanly/state/strings'
import { useLayout } from '@ihsaanly/ui/layout'
import { passes } from '@ihsaanly/ui/props/library'
import {
  type LibraryFilter,
  LibraryScreen,
  type LibrarySectionView,
} from '@ihsaanly/ui/screens/library'
import { Stack, usePathname, useSegments } from 'expo-router'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { useColorScheme } from 'react-native'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

interface Thing {
  query: string
  filter: LibraryFilter
}

/**
 * The path under `(library)`, or `null` while some other tab is focused.
 * `useSegments`/`usePathname` are both global — off-screen they would
 * otherwise report whatever tab currently has focus — so `segments[0]`
 * (the group's own literal, unresolved name) is what tells this tab's own
 * state apart from a stale read of another one. `pathname` is what resolves
 * a dynamic `item/[id]` into its real id, which `segments` does not.
 */
export function libraryPath(segments: string[], pathname: string): string[] | null {
  if (segments[0] !== '(library)') return null
  return pathname.split('/').filter(Boolean)
}

/** The item id open in the wide reader panel: `item/<id>` and
 * `item/memorise/<id>` both belong to the same card. */
function selectedItemId(parts: string[] | null): string | null {
  if (!parts || parts[0] !== 'item') return null
  return (parts[1] === 'memorise' ? parts[2] : parts[1]) ?? null
}

/**
 * The Library list: search, filter chips, glossary row and category
 * sections. Takes nothing and reads its own stores, so both the compact
 * route (`(library)/index.tsx`, rendered inside the native `Stack`) and the
 * regular/wide layout (the fixed list pane beside the reader `Panel`) render
 * the same component.
 */
export function LibraryPane(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '', filter: 'all' })
  const strings = useStrings()
  const palette = usePalette()
  const enabled = useEnabledItems()
  const known = useKnownItems()
  const layout = useLayout()
  const segments = useSegments()
  const pathname = usePathname()
  useColorScheme()

  const matching = searchItems(items, thing.query)
  const labelOf = (category: string): string => strings.category[category] ?? category
  const setQuery = (query: string): void => setThing((current) => ({ ...current, query }))

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
    <>
      {/* Same bar as More: a search button in the app bar that opens the field.
          Only meaningful under the real Stack at compact — at regular/wide there
          is no native header here, so LibraryScreen's own `searchable` field
          takes over instead. */}
      {layout === 'compact' ? (
        <Stack.SearchBar
          placeholder={strings.library.search}
          placement="integratedButton"
          allowToolbarIntegration={false}
          autoCapitalize="none"
          tintColor={palette.accent}
          textColor={colors.label}
          hintTextColor={colors.secondaryLabel}
          headerIconColor={colors.label}
          onChangeText={(event) => setQuery(event.nativeEvent.text ?? '')}
          onCancelButtonPress={() => setQuery('')}
          onClose={() => setQuery('')}
        />
      ) : null}
      <LibraryScreen
        query={thing.query}
        filter={thing.filter}
        counts={{
          all: matching.length,
          onToday: matching.filter((item) => enabled.includes(item.id)).length,
          known: matching.filter((item) => known.includes(item.id)).length,
        }}
        sections={sections}
        glossaryHref="/glossary"
        onFilterChange={(filter) => setThing((current) => ({ ...current, filter }))}
        searchable={
          layout === 'compact'
            ? undefined
            : { query: thing.query, onQueryChange: setQuery, placeholder: strings.library.search }
        }
        selectedId={
          layout === 'compact' ? undefined : selectedItemId(libraryPath(segments, pathname))
        }
      />
    </>
  )
}
