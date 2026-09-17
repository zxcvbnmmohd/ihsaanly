import { Stack } from 'expo-router/stack';

import { strings } from '@/strings';
import { useStackScreenOptions } from '@/theme/stack';

export default function MoreLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.more.title }} />
    </Stack>
  );
}
