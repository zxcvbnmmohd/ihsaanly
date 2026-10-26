import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { AccentPicker } from '../components/accent-picker'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'
import { type AccentName, THEME_PREFERENCES, type ThemePreference } from '../types'

export interface AppearanceScreenProps {
  preference: ThemePreference
  onSelect: (preference: ThemePreference) => void
  accent: AccentName
  onSelectAccent: (accent: AccentName) => void
}

export function AppearanceScreen({
  preference,
  onSelect,
  accent,
  onSelectAccent,
}: AppearanceScreenProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const palette = usePalette()

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

      <View className="gap-3 pt-2">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {strings.appearance.accentTitle}
        </Text>
        <AccentPicker value={accent} onSelect={onSelectAccent} />
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.appearance.accentNote}
        </Text>
      </View>
    </Screen>
  )
}
