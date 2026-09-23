import type { ReactElement } from 'react'
import { Link, Stack } from 'expo-router'
import { Text, useColorScheme, View } from 'react-native'

import { Screen } from '@/components/screen'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { useStackScreenOptions } from '@/theme/stack'
import { usePalette } from '@/theme/store'

export default function NotFound(): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <>
      <Stack.Screen options={{ ...useStackScreenOptions(), title: strings.notFound.title }} />
      <Screen palette={palette} className="flex-grow items-center justify-center gap-4 p-6">
        <Text className="text-xl font-semibold" style={{ color: colors.label }}>
          {strings.notFound.body}
        </Text>
        <View className="rounded-full px-5 py-3" style={{ backgroundColor: palette.accent }}>
          <Link href="/" className="text-base font-semibold" style={{ color: palette.onAccent }}>
            {strings.tabs.today}
          </Link>
        </View>
      </Screen>
    </>
  )
}
