import type { ReactElement } from 'react'
import { Stack } from 'expo-router/stack'

import { useStrings } from '@/strings'
import { useStackScreenOptions } from '@/theme/stack'

export default function MoreLayout(): ReactElement {
  const strings = useStrings()
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.more.title }} />
      <Stack.Screen name="location" options={{ title: strings.location.title }} />
      <Stack.Screen name="calculation" options={{ title: strings.calculation.title }} />
      <Stack.Screen name="hijri" options={{ title: strings.hijri.title }} />
      <Stack.Screen name="notifications" options={{ title: strings.notifications.title }} />
      <Stack.Screen name="tracking" options={{ title: strings.tracking.title }} />
      <Stack.Screen name="events" options={{ title: strings.events.title }} />
      <Stack.Screen name="history" options={{ title: strings.history.title }} />
      <Stack.Screen name="qada" options={{ title: strings.qada.title }} />
      <Stack.Screen name="data" options={{ title: strings.data.title }} />
      <Stack.Screen name="language" options={{ title: strings.language.title }} />
      <Stack.Screen name="appearance" options={{ title: strings.appearance.title }} />
      <Stack.Screen name="moon-sighting" options={{ title: strings.moonSighting.title }} />
    </Stack>
  )
}
