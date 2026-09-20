import { Link, type Href } from 'expo-router'
import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { Pill } from '@/components/pill'
import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import { TextField } from '@/components/text-field'
import { Wash } from '@/components/wash'
import type { Ruling } from '@/content/schema'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

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
  const palette = usePalette()
  useColorScheme()

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <Wash palette={palette} />
      <Screen className="gap-6 p-4">
        <TextField
          value={query}
          onChangeText={onQueryChange}
          placeholder={strings.library.search}
          kind="search"
          returnKeyType="search"
          accent={palette.accent}
        />

        {sections.length === 0 ? (
          <EmptyState message={query.trim() ? strings.library.noResults : strings.library.empty} />
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
                        <Pill
                          label={strings.ruling[entry.ruling]}
                          emphasis={entry.ruling === 'fard' || entry.ruling === 'wajib'}
                          accent={palette.accent}
                          onAccent={palette.onAccent}
                        />
                      </View>
                    </Surface>
                  </Pressable>
                </Link>
              ))}
            </View>
          ))
        )}
      </Screen>
    </View>
  )
}
