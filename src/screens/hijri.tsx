import { Text, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { offsetOptions, type HijriDate } from '@/hijri/calendar';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export interface HijriScreenProps {
  offset: number;
  preview: HijriDate | null;
  onChange: (offset: number) => void;
}

export function HijriScreen({ offset, preview, onChange }: HijriScreenProps) {
  useColorScheme();

  return (
    <Screen className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.hijri.explanation}
      </Text>

      {preview ? (
        <Text className="text-2xl font-semibold" style={{ color: colors.label }}>
          {strings.hijri.format(preview.day, strings.hijriMonth[preview.month] ?? '', preview.year)}
        </Text>
      ) : null}

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.hijri.offset}
        </Text>
        {offsetOptions().map((option) => (
          <Row
            key={option}
            title={strings.hijri.offsetLabel(option)}
            selected={offset === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </Screen>
  );
}
