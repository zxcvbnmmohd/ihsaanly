import { useColorScheme } from 'react-native';

import { colors } from '@/theme/colors';

/**
 * Shared native large-title header options for every tab's stack.
 *
 * A hook rather than a module constant on purpose: `colors` resolves to
 * Material dynamic values on Android that don't re-resolve on their own, so
 * this has to be read during render with a `useColorScheme()` subscription.
 */
export function useStackScreenOptions() {
  useColorScheme();

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
