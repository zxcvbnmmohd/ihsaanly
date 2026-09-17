import { ScrollView, Text, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import {
  AsrOpinion,
  CalculationMethodName,
  HighLatitudeRuleName,
  type CalculationPreferences,
} from '@/prayer/calculation';
import { setCalculationPreferences, useCalculationPreferences } from '@/prayer/store';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

function Section({
  title,
  footnote,
  children,
}: {
  title: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  useColorScheme();

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
  );
}

export default function Calculation() {
  useColorScheme();

  const preferences = useCalculationPreferences();

  const update = (change: Partial<CalculationPreferences>) =>
    setCalculationPreferences({ ...preferences, ...change });

  return (
    <ScrollView contentContainerClassName="gap-8 p-4" contentInsetAdjustmentBehavior="automatic">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.calculation.explanation}
      </Text>

      <Section title={strings.calculation.asr}>
        {AsrOpinion.options.map((option) => (
          <Row
            key={option}
            title={strings.asr[option]}
            selected={preferences.asr === option}
            onPress={() => update({ asr: option })}
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
            onPress={() => update({ highLatitudeRule: option })}
          />
        ))}
      </Section>

      <Section title={strings.calculation.method}>
        {CalculationMethodName.options.map((option) => (
          <Row
            key={option}
            title={strings.method[option]}
            selected={preferences.method === option}
            onPress={() => update({ method: option })}
          />
        ))}
      </Section>
    </ScrollView>
  );
}
