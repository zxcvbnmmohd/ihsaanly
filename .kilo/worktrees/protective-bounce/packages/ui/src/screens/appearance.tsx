import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text } from 'react-native'
import { useColors } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'
import { THEME_PREFERENCES, type ThemePreference } from '../types'

export interface AppearanceScreenProps {
  preference: ThemePreference
  onSelect: (preference: ThemePreference) => void
}

export function AppearanceScreen({ preference, onSelect }: AppearanceScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-4 p-4">
      {THEME_PREFERENCES.map((option) => (
        <ChoiceRow
          key={option}
          title={strings.appearance[option]}
          selected={preference === option}
          onPress={() => onSelect(option)}
          accent={palette.accent}
        />
      ))}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.appearance.note}
      </Text>
    </Screen>
  )
}
