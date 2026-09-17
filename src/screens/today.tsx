import type { Href } from 'expo-router';
import { ScrollView, Text, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import type { HijriDate } from '@/hijri/calendar';
import type { WindowName } from '@/prayer/windows';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export type TodayScreenProps = {
  hasLocation: boolean;
  window: WindowName | null;
  hijri: HijriDate | null;
  locationHref: Href;
};

export function TodayScreen({ hasLocation, window, hijri, locationHref }: TodayScreenProps) {
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
    <ScrollView contentContainerClassName="gap-6 p-4" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.today.title}
        </Text>
        <Text className="text-3xl font-semibold" style={{ color: colors.label }}>
          {window ? strings.window[window] : strings.today.empty}
        </Text>
      </View>

      {hijri ? (
        <View className="gap-1">
          <Text className="text-lg" style={{ color: colors.label }}>
            {strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year)}
          </Text>
          <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
            {strings.hijri.approximate}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
