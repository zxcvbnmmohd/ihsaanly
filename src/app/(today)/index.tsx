import { ScrollView, Text, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import { usePlace } from '@/location/store';
import { useCurrentWindow } from '@/prayer/use-current-window';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export default function Today() {
  useColorScheme();

  const place = usePlace();
  const window = useCurrentWindow();

  if (!place) {
    return (
      <ScrollView contentContainerClassName="gap-4 p-4" contentInsetAdjustmentBehavior="automatic">
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {strings.today.needsLocation}
        </Text>
        <Row href="/location" title={strings.location.title} detail={strings.location.notSet} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-4 p-4" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.today.title}
        </Text>
        <Text className="text-3xl font-semibold" style={{ color: colors.label }}>
          {window ? strings.window[window.name] : strings.today.empty}
        </Text>
      </View>
    </ScrollView>
  );
}
