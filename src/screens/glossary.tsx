import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import { Wash } from '@/components/wash'
import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/store'

export interface GlossaryEntry {
  id: string
  term: string
  definition: string
}

export interface GlossaryScreenProps {
  entries: GlossaryEntry[]
  /** The term the reader came for, shown first and marked. */
  highlighted: string | null
}

/** The words the app uses, each in a sentence or two, for someone meeting them for the first time. */
export function GlossaryScreen({ entries, highlighted }: GlossaryScreenProps): ReactElement {
  const palette = usePalette()
  useColorScheme()

  const ordered = [
    ...entries.filter((entry) => entry.id === highlighted),
    ...entries.filter((entry) => entry.id !== highlighted),
  ]

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <Wash palette={palette} />
      <Screen className="gap-3 p-4">
        {ordered.map((entry) => (
          <Surface
            key={entry.id}
            style={{
              borderRadius: 20,
              padding: 18,
              borderWidth: entry.id === highlighted ? 2 : 0,
              borderColor: palette.accent,
            }}>
            <View className="gap-1.5">
              <Text
                className="text-xl leading-tight"
                style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
                {entry.term}
              </Text>
              <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
                {entry.definition}
              </Text>
            </View>
          </Surface>
        ))}
      </Screen>
    </View>
  )
}
