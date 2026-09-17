import type { ReactElement } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Text, useColorScheme, View } from 'react-native';

import { strings } from '@/strings';
import { colors } from '@/theme/colors';

import '../../global.css';

/**
 * Expo Router renders this instead of a white screen when a render throws.
 * Without it, release builds show nothing and the cause is invisible.
 */
interface ErrorBoundaryProps {
  error: Error;
  retry: () => Promise<void>;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps): ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <Text className="text-xl font-semibold" style={{ color: colors.label }}>
        {strings.error.title}
      </Text>
      <Text selectable className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
        {error.message}
      </Text>
      <Text
        onPress={() => retry()}
        className="text-base font-semibold"
        style={{ color: colors.tint }}>
        {strings.error.retry}
      </Text>
    </View>
  );
}

export default function RootLayout(): ReactElement {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="(today)">
          <NativeTabs.Trigger.Icon sf="sun.max.fill" md="today" />
          <NativeTabs.Trigger.Label>{strings.tabs.today}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(library)">
          <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
          <NativeTabs.Trigger.Label>{strings.tabs.library}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(more)">
          <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
          <NativeTabs.Trigger.Label>{strings.tabs.more}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
