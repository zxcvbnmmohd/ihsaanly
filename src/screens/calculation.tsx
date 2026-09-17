import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import {
  AsrOpinion,
  CalculationMethodName,
  HighLatitudeRuleName,
  type CalculationPreferences,
} from '@/prayer/calculation'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

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
  useColorScheme()

  return (
    <Screen className="gap-8 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.calculation.explanation}
      </Text>

      <Section title={strings.calculation.asr}>
        {AsrOpinion.options.map((option) => (
          <Row
            key={option}
            title={strings.asr[option]}
            selected={preferences.asr === option}
            onPress={() => onChange({ asr: option })}
          />
        ))}
      </Section>

      <Section
        title={strings.calculation.highLatitude}
        footnote={strings.calculation.highLatitudeExplanation}>
        {HighLatitudeRuleName.options.map((option) => (
          <Row
            key={option}
            title={strings.highLatitude[option]}
            selected={preferences.highLatitudeRule === option}
            onPress={() => onChange({ highLatitudeRule: option })}
          />
        ))}
      </Section>

      <Section title={strings.calculation.method}>
        {CalculationMethodName.options.map((option) => (
          <Row
            key={option}
            title={strings.method[option]}
            selected={preferences.method === option}
            onPress={() => onChange({ method: option })}
          />
        ))}
      </Section>
    </Screen>
  )
}
