import type { Href } from 'expo-router'
import type { ReactElement } from 'react'
import { Text, TextInput, useColorScheme, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { Ruling } from '@/content/schema'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export interface LibraryEntry {
  id: string
  title: string
  ruling: Ruling
  href: Href
}

export interface LibrarySectionView {
  category: string
  entries: LibraryEntry[]
}

export interface LibraryScreenProps {
  query: string
  sections: LibrarySectionView[]
  onQueryChange: (query: string) => void
}

export function LibraryScreen({
  query,
  sections,
  onQueryChange,
}: LibraryScreenProps): ReactElement {
  const strings = useStrings()
  useColorScheme()

  return (
    <Screen className="gap-6 p-4">
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder={strings.library.search}
        placeholderTextColor={colors.secondaryLabel}
        autoCorrect={false}
        className="rounded-2xl px-4 py-3 text-base"
        style={{ backgroundColor: colors.secondarySystemBackground, color: colors.label }}
      />

      {sections.length === 0 ? (
        <EmptyState message={query.trim() ? strings.library.noResults : strings.library.empty} />
      ) : (
        sections.map((section) => (
          <View key={section.category} className="gap-3">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.secondaryLabel }}>
              {strings.category[section.category] ?? section.category}
            </Text>
            {section.entries.map((entry) => (
              <Row
                key={entry.id}
                href={entry.href}
                title={entry.title}
                detail={strings.ruling[entry.ruling]}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  )
}
