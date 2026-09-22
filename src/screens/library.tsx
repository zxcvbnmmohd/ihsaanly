import { Link, type Href } from 'expo-router'
import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { Pill } from '@/components/pill'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import type { Ruling } from '@/content/schema'
import { useStrings, type Strings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export type LibraryFilter = 'all' | 'onToday' | 'known'

export const LIBRARY_FILTERS: LibraryFilter[] = ['all', 'onToday', 'known']

export interface LibraryEntry {
  id: string
  title: string
  ruling: Ruling
  href: Href
  onToday: boolean
  known: boolean
}

export interface LibrarySectionView {
  category: string
  entries: LibraryEntry[]
}

export interface LibraryScreenProps {
  query: string
  filter: LibraryFilter
  counts: Record<LibraryFilter, number>
  sections: LibrarySectionView[]
  glossaryHref: Href
  onFilterChange: (filter: LibraryFilter) => void
}

function filterLabel(filter: LibraryFilter, strings: Strings): string {
  if (filter === 'onToday') return strings.library.filterOnToday
  if (filter === 'known') return strings.library.filterKnown
  return strings.library.filterAll
}

function emptyMessage(query: string, filter: LibraryFilter, strings: Strings): string {
  if (query.trim()) return strings.library.noResults
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
}: LibraryScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <View className="flex-row gap-2">
        {LIBRARY_FILTERS.map((candidate) => (
          <Chip
            key={candidate}
            label={`${filterLabel(candidate, strings)} · ${counts[candidate]}`}
            selected={filter === candidate}
            onPress={() => onFilterChange(candidate)}
            palette={palette}
          />
        ))}
      </View>

      {query.trim() === '' && filter === 'all' ? (
        <Row
          href={glossaryHref}
          title={strings.library.terms}
          detail={strings.library.termsDetail}
        />
      ) : null}

      {sections.length === 0 ? (
        <EmptyState message={emptyMessage(query, filter, strings)} />
      ) : (
        sections.map((section) => (
          <View key={section.category} className="gap-3">
            <Text
              className="text-xs font-semibold tracking-wide uppercase"
              style={{ color: palette.accent }}>
              {strings.category[section.category] ?? section.category}
            </Text>
            {section.entries.map((entry) => (
              <Link key={entry.id} href={entry.href} asChild>
                <Pressable accessibilityRole="link">
                  <Surface interactive style={{ borderRadius: 16, padding: 16 }}>
                    <View className="gap-2">
                      <Text className="text-base font-semibold" style={{ color: colors.label }}>
                        {entry.title}
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        <Pill
                          label={strings.ruling[entry.ruling]}
                          emphasis={entry.ruling === 'fard' || entry.ruling === 'wajib'}
                          accent={palette.accent}
                          onAccent={palette.onAccent}
                        />
                        {entry.onToday ? (
                          <Pill
                            label={strings.library.onToday}
                            emphasis
                            accent={palette.accent}
                            onAccent={palette.onAccent}
                          />
                        ) : null}
                        {entry.known ? (
                          <Pill
                            label={strings.library.known}
                            accent={palette.accent}
                            onAccent={palette.onAccent}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Surface>
                </Pressable>
              </Link>
            ))}
          </View>
        ))
      )}
    </Screen>
  )
}
