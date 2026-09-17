import { useColorScheme } from 'react-native';

import { colors } from '@/theme/colors';

/** A hook, not a constant: Android Material colours only re-resolve during render. */
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
