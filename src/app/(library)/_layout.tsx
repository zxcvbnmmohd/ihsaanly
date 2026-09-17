import type { ReactElement } from 'react';
import { Stack } from 'expo-router/stack';

import { strings } from '@/strings';
import { useStackScreenOptions } from '@/theme/stack';

export default function LibraryLayout(): ReactElement {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.library.title }} />
    </Stack>
  );
}
