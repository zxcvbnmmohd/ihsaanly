import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'

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
  const colors = useColors()
  const palette = palettes[useUi().scheme]

  const ordered = [
    ...entries.filter((entry) => entry.id === highlighted),
    ...entries.filter((entry) => entry.id !== highlighted),
  ]

  return (
    <Screen palette={palette} className="gap-3 p-4">
      {ordered.map((entry) => (
        <Surface
          key={entry.id}
          style={{
            borderRadius: 20,
            padding: 18,
            borderWidth: entry.id === highlighted ? 2 : 0,
            // Surface has no className, so the accent border stays a raw value here.
            borderColor: palette.accent,
          }}>
          <View className="gap-1.5">
            <Text
              className="text-xl leading-tight"
              style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
              {entry.term}
            </Text>
            <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
              {entry.definition}
            </Text>
          </View>
        </Surface>
      ))}
    </Screen>
  )
}
