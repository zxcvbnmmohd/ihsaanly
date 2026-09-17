import { Text, useColorScheme, View } from 'react-native';

import { colors } from '@/theme/colors';

/**
 * Placeholder for a screen whose content lands in a later ticket.
 *
 * ponytail: one component instead of three near-identical screens — delete it
 * once every tab has real content.
 */
export function EmptyState({ message }: { message: string }) {
  // Android's Material colors don't re-resolve on their own; subscribing here
  // forces a re-render when the theme flips (React Compiler memoizes).
  useColorScheme();

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-center text-base" style={{ color: colors.secondaryLabel }}>
        {message}
      </Text>
    </View>
  );
}
