import { Platform, useColorScheme } from 'react-native';

import { colors } from '@/theme/colors';

/**
 * A hook, not a constant: Android Material colours only re-resolve during render.
 *
 * Transparent headers with large titles are an iOS pattern that relies on
 * `contentInsetAdjustmentBehavior`, which Android does not have. Keeping it
 * cross-platform renders content underneath the header and the status bar, so
 * Android gets an opaque header that occupies layout space instead.
 */
export function useStackScreenOptions() {
  useColorScheme();

  if (Platform.OS !== 'ios') {
    return {
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.systemBackground },
      headerTitleStyle: { color: colors.label },
      headerTintColor: colors.label,
      headerBackButtonDisplayMode: 'minimal',
    } as const;
  }

  return {
    headerTransparent: true,
    headerShadowVisible: false,
    headerLargeTitleEnabled: true,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerTitleStyle: { color: colors.label },
    headerBackButtonDisplayMode: 'minimal',
  } as const;
}
