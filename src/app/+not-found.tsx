import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-xl font-semibold" style={{ color: colors.label }}>
          This screen doesn’t exist.
        </Text>
        <Link href="/" className="text-base" style={{ color: colors.tint }}>
          Go to home
        </Link>
      </View>
    </>
  );
}
