import type { Href } from 'expo-router';
import { ScrollView, Text, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import type { WindowName } from '@/prayer/windows';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export type TodayScreenProps = {
  hasLocation: boolean;
  window: WindowName | null;
  locationHref: Href;
};

export function TodayScreen({ hasLocation, window, locationHref }: TodayScreenProps) {
  useColorScheme();

  if (!hasLocation) {
    return (
      <ScrollView contentContainerClassName="gap-4 p-4" contentInsetAdjustmentBehavior="automatic">
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {strings.today.needsLocation}
        </Text>
        <Row href={locationHref} title={strings.location.title} detail={strings.location.notSet} />
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
          {window ? strings.window[window] : strings.today.empty}
        </Text>
      </View>
    </ScrollView>
  );
}
