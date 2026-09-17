import type { ReactElement } from 'react'
import { Stack } from 'expo-router/stack'

import { strings } from '@/strings'
import { useStackScreenOptions } from '@/theme/stack'

export default function MoreLayout(): ReactElement {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.more.title }} />
      <Stack.Screen name="location" options={{ title: strings.location.title }} />
      <Stack.Screen name="calculation" options={{ title: strings.calculation.title }} />
      <Stack.Screen name="hijri" options={{ title: strings.hijri.title }} />
      <Stack.Screen name="notifications" options={{ title: strings.notifications.title }} />
      <Stack.Screen name="tracking" options={{ title: strings.tracking.title }} />
      <Stack.Screen name="moon-sighting" options={{ title: strings.moonSighting.title }} />
    </Stack>
  )
}
