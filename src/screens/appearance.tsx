import type { ReactElement } from 'react'
import { Text, useColorScheme } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'
import { THEME_PREFERENCES, type ThemePreference } from '@/theme/store'

export interface AppearanceScreenProps {
  preference: ThemePreference
  onSelect: (preference: ThemePreference) => void
}

export function AppearanceScreen({ preference, onSelect }: AppearanceScreenProps): ReactElement {
  useColorScheme()

  return (
    <Screen className="gap-4 p-4">
      {THEME_PREFERENCES.map((option) => (
        <Row
          key={option}
          title={strings.appearance[option]}
          selected={preference === option}
          onPress={() => onSelect(option)}
        />
      ))}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.appearance.note}
      </Text>
    </Screen>
  )
}
