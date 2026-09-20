import type { ReactElement } from 'react'
import { Text, useColorScheme } from 'react-native'

import { ChoiceRow } from '@/components/choice-row'
import { Screen } from '@/components/screen'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'
import { THEME_PREFERENCES, type ThemePreference } from '@/theme/store'

export interface AppearanceScreenProps {
  preference: ThemePreference
  onSelect: (preference: ThemePreference) => void
}

export function AppearanceScreen({ preference, onSelect }: AppearanceScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen className="gap-4 p-4">
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
