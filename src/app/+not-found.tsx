import type { ReactElement } from 'react'
import { Link, Stack } from 'expo-router'
import { Text, useColorScheme, View } from 'react-native'

import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export default function NotFound(): ReactElement {
  const strings = useStrings()
  useColorScheme()

  return (
    <>
      <Stack.Screen options={{ title: strings.notFound.title }} />
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-xl font-semibold" style={{ color: colors.label }}>
          {strings.notFound.body}
        </Text>
        <Link href="/" className="text-base" style={{ color: colors.tint }}>
          {strings.tabs.today}
        </Link>
      </View>
    </>
  )
}
