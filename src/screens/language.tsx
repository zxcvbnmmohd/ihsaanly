import type { ReactElement } from 'react'
import { Text, useColorScheme } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/locale'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export interface LanguageScreenProps {
  locale: SupportedLocale
  onSelect: (locale: SupportedLocale) => void
}

export function LanguageScreen({ locale, onSelect }: LanguageScreenProps): ReactElement {
  const strings = useStrings()
  useColorScheme()

  return (
    <Screen className="gap-4 p-4">
      {SUPPORTED_LOCALES.map((option) => (
        <Row
          key={option}
          title={strings.language.names[option] ?? option}
          selected={locale === option}
          onPress={() => onSelect(option)}
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
