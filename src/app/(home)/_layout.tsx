import type { ReactElement } from 'react'
import { Stack } from 'expo-router/stack'

import { useStrings } from '@/strings'
import { useStackScreenOptions } from '@/theme/stack'

// A deep link or notification tap into this stack still gets its index underneath,
// so Back returns to the tab's own screen instead of leaving the tab.
export const unstable_settings = { anchor: 'index' }

export default function TodayLayout(): ReactElement {
  const strings = useStrings()
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: strings.today.title }} />
    </Stack>
  )
}
