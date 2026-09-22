import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ChoiceRow } from '@/components/choice-row'
import { Screen } from '@/components/screen'
import {
  AsrOpinion,
  CalculationMethodName,
  HighLatitudeRuleName,
  type CalculationPreferences,
} from '@/prayer/calculation'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface CalculationScreenProps {
  preferences: CalculationPreferences
  onChange: (change: Partial<CalculationPreferences>) => void
}

interface SectionProps {
  title: string
  footnote?: string
  children: ReactNode
}

function Section({ title, footnote, children }: SectionProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
        {title}
      </Text>
      {children}
      {footnote ? (
        <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
          {footnote}
        </Text>
      ) : null}
    </View>
  )
}

export function CalculationScreen({ preferences, onChange }: CalculationScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-8 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.calculation.explanation}
      </Text>

      <Section title={strings.calculation.asr}>
        {AsrOpinion.options.map((option) => (
          <ChoiceRow
            key={option}
            title={strings.asr[option]}
            selected={preferences.asr === option}
            onPress={() => onChange({ asr: option })}
            accent={palette.accent}
          />
        ))}
      </Section>

      <Section
        title={strings.calculation.highLatitude}
        footnote={strings.calculation.highLatitudeExplanation}>
        {HighLatitudeRuleName.options.map((option) => (
          <ChoiceRow
            key={option}
            title={strings.highLatitude[option]}
            selected={preferences.highLatitudeRule === option}
            onPress={() => onChange({ highLatitudeRule: option })}
            accent={palette.accent}
          />
        ))}
      </Section>

      <Section title={strings.calculation.method}>
        {CalculationMethodName.options.map((option) => (
          <ChoiceRow
            key={option}
            title={strings.method[option]}
            selected={preferences.method === option}
            onPress={() => onChange({ method: option })}
            accent={palette.accent}
          />
        ))}
      </Section>
    </Screen>
  )
}
