import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text } from 'react-native'
import { useColors } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'

export interface LanguageScreenProps {
  language: SupportedLanguage
  onSelect: (language: SupportedLanguage) => void
}

export function LanguageScreen({ language, onSelect }: LanguageScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

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
