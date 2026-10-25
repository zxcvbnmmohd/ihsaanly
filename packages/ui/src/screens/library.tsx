import type { Ruling } from '@ihsaanly/core/content/schema'
import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Chip } from '../components/chip'
import { EmptyState } from '../components/empty-state'
import { LibraryCard } from '../components/library-card'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { TextField } from '../components/text-field'
import { useLayout } from '../layout'
import { useUi } from '../provider'
import { columnBasisFor } from './library-grid'

export type LibraryFilter = 'all' | 'onToday' | 'known' | 'mine'

/** The filters over content, which every host counts. `mine` is offered only with `mine`. */
export type ContentFilter = Exclude<LibraryFilter, 'mine'>

export const LIBRARY_FILTERS: ContentFilter[] = ['all', 'onToday', 'known']

export interface LibraryEntry {
  id: string
  title: string
  ruling: Ruling
  href: string
  onToday: boolean
  known: boolean
  /** One line of the item's translation, when it carries one. */
  subtitle?: string | null
}

export interface LibrarySectionView {
  category: string
  entries: LibraryEntry[]
}

/** A dua the user wrote, listed under My duas. */
export interface OwnDuaEntry {
  id: string
  title: string
  /** A line of its words, when it has them. */
  detail: string | null
  href: string
}

/**
 * My duas, for a host that keeps them: pinned items arrive as `sections`
 * under the `mine` filter like any other filter's, and the user's own as `own`.
 */
export interface LibraryMine {
  /** Pinned and own together, for the chip. */
  count: number
  own: OwnDuaEntry[]
  writeHref: string
}

export interface LibrarySearchable {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
}

export interface LibraryScreenProps {
  query: string
  filter: LibraryFilter
  counts: Record<ContentFilter, number>
  sections: LibrarySectionView[]
  glossaryHref: string
  onFilterChange: (filter: LibraryFilter) => void
  /** Set by a host that wants the search field inside the screen instead of its own chrome. */
  searchable?: LibrarySearchable
  /** The entry open in a regular/wide reader panel, if any. */
  selectedId?: string | null
  /** Offers the My duas filter. */
  mine?: LibraryMine
}

function filterLabel(filter: LibraryFilter, strings: Strings): string {
  if (filter === 'mine') return strings.myDuas.title
  if (filter === 'onToday') return strings.library.filterOnToday
  if (filter === 'known') return strings.library.filterKnown
  return strings.library.filterAll
}

function emptyMessage(query: string, filter: LibraryFilter, strings: Strings): string {
  if (query.trim()) return strings.library.noResults
  if (filter === 'mine') return strings.myDuas.empty
  if (filter === 'onToday') return strings.library.emptyOnToday
  if (filter === 'known') return strings.library.emptyKnown
  return strings.library.empty
}

export function LibraryScreen({
  query,
  filter,
  counts,
  sections,
  glossaryHref,
  onFilterChange,
  searchable,
  selectedId = null,
  mine,
}: LibraryScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const layout = useLayout()
  const showTerms = query.trim() === '' && filter === 'all'
  const filters: { filter: LibraryFilter; count: number }[] = [
    ...LIBRARY_FILTERS.map((candidate) => ({ filter: candidate, count: counts[candidate] })),
    ...(mine ? [{ filter: 'mine' as const, count: mine.count }] : []),
  ]
  const chips = (
    <View className="flex-row flex-wrap gap-2">
      {filters.map((candidate) => (
        <Chip
          key={candidate.filter}
          label={`${filterLabel(candidate.filter, strings)} · ${candidate.count}`}
          selected={filter === candidate.filter}
          onPress={() => onFilterChange(candidate.filter)}
          palette={palette}
        />
      ))}
    </View>
  )
  const own = filter === 'mine' && mine ? mine.own : []
  const isEmpty = sections.length === 0 && own.length === 0
  const mineBlock =
    filter === 'mine' && mine ? (
      <View className="gap-3">
        <Row
          href={mine.writeHref}
          title={strings.myDuas.write}
          detail={strings.myDuas.writeDetail}
        />
        {own.length > 0 ? (
          <View className="gap-3">
            <Text
              accessibilityRole="header"
              aria-level={2}
              className="font-semibold text-xs uppercase tracking-wide"
              style={{ color: colors.accent }}>
              {strings.myDuas.yours}
            </Text>
            {own.map((entry) => (
              <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
            ))}
          </View>
        ) : null}
      </View>
    ) : null
  const search = searchable ? (
    <TextField
      kind="search"
      value={searchable.query}
      onChangeText={searchable.onQueryChange}
      placeholder={searchable.placeholder}
      label={strings.library.searchLabel}
      accent={palette.accent}
    />
  ) : null

  if (layout === 'compact') {
    return (
      <Screen palette={palette} className="gap-6 p-4">
        {search}
        {chips}

        {showTerms ? (
          <Row
            href={glossaryHref}
            title={strings.library.terms}
            detail={strings.library.termsDetail}
          />
        ) : null}

        {mineBlock}

        {isEmpty ? (
          <EmptyState message={emptyMessage(query, filter, strings)} />
        ) : (
          sections.map((section) => (
            <View key={section.category} className="gap-3">
              <Text
                accessibilityRole="header"
                aria-level={2}
                className="font-semibold text-xs uppercase tracking-wide"
                style={{ color: colors.accent }}>
                {strings.category[section.category] ?? section.category}
              </Text>
              {section.entries.map((entry) => (
                <LibraryCard key={entry.id} entry={entry} selected={entry.id === selectedId} />
              ))}
            </View>
          ))
        )}
      </Screen>
    )
  }

  return (
    <Screen palette={palette} maxWidth={1200} className="gap-6 p-4">
      <View className="flex-row items-center gap-3">
        {search ? <View className="flex-1">{search}</View> : null}
        {chips}
      </View>

      {showTerms ? (
        <Row
          href={glossaryHref}
          title={strings.library.terms}
          detail={strings.library.termsDetail}
        />
      ) : null}

      {mineBlock}

      {isEmpty ? (
        <EmptyState message={emptyMessage(query, filter, strings)} />
      ) : (
        sections.map((section) => (
          <View key={section.category} className="gap-3">
            <Text
              accessibilityRole="header"
              aria-level={2}
              className="font-semibold text-xs uppercase tracking-wide"
              style={{ color: colors.accent }}>
              {strings.category[section.category] ?? section.category}
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {section.entries.map((entry) => (
                <View key={entry.id} style={{ flexBasis: columnBasisFor(layout), flexGrow: 0 }}>
                  <LibraryCard entry={entry} selected={entry.id === selectedId} />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  )
}
