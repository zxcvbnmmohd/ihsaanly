import type { ReactElement } from 'react'
import { Text, useColorScheme } from 'react-native'

import { ChoiceRow } from '@/components/choice-row'
import { Screen } from '@/components/screen'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/locale'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface LanguageScreenProps {
  language: SupportedLanguage
  onSelect: (language: SupportedLanguage) => void
}

export function LanguageScreen({ language, onSelect }: LanguageScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-4 p-4">
      {SUPPORTED_LANGUAGES.map((option) => (
        <ChoiceRow
          key={option}
          title={strings.language.names[option]}
          selected={language === option}
          onPress={() => onSelect(option)}
          accent={palette.accent}
        />
      ))}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.language.restart}
      </Text>
      <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
        {strings.language.incomplete}
      </Text>
    </Screen>
  )
}
