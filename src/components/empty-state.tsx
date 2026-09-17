import { Text, useColorScheme, View } from 'react-native';

import { colors } from '@/theme/colors';

export function EmptyState({ message }: { message: string }) {
  useColorScheme(); // Android Material colours need this to re-resolve on theme change

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-center text-base" style={{ color: colors.secondaryLabel }}>
        {message}
      </Text>
    </View>
  );
}
