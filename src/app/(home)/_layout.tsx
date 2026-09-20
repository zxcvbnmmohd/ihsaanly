import type { ReactElement } from 'react'
import { Stack } from 'expo-router/stack'

import { useStrings } from '@/strings'
import { useStackScreenOptions } from '@/theme/stack'

export default function TodayLayout(): ReactElement {
  const strings = useStrings()
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.today.title }} />
    </Stack>
  )
}
