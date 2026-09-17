import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Text, useColorScheme, View } from 'react-native';

import { colors } from '@/theme/colors';

import '../../global.css';

/**
 * Expo Router renders this instead of a white screen when a render throws.
 * Without it, release builds show nothing and the cause is invisible.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <Text className="text-xl font-semibold" style={{ color: colors.label }}>
        Something went wrong
      </Text>
      <Text selectable className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
        {error.message}
      </Text>
      <Text
        onPress={() => retry()}
        className="text-base font-semibold"
        style={{ color: colors.tint }}>
        Try again
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">
          <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
