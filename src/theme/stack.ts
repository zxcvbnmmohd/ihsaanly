import type { Stack } from 'expo-router/stack'
import type { ComponentProps } from 'react'
import { Platform, useColorScheme } from 'react-native'

import { colors } from '@/theme/colors'

/**
 * A hook, not a constant: Android Material colours only re-resolve during render.
 *
 * iOS keeps its large title, but the header is no longer transparent. A
 * transparent header sits outside the layout, so the scroll view is never inset
 * by it and the large title has nothing to collapse against: it stayed pinned
 * while the content slid underneath it, which is the opposite of the native
 * behaviour it was meant to borrow. An ordinary translucent header insets the
 * scroll view, collapses on scroll, and still lets the wash show through its
 * material. Android has no equivalent, so it keeps an opaque header.
 */
type StackScreenOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>

export function useStackScreenOptions(): StackScreenOptions {
  useColorScheme()

  if (Platform.OS !== 'ios') {
    return {
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.systemBackground },
      headerTitleStyle: { color: colors.label },
      headerTintColor: colors.label,
      headerBackButtonDisplayMode: 'minimal',
    }
  }

  return {
    headerShadowVisible: false,
    headerLargeTitleEnabled: true,
    headerLargeTitleShadowVisible: false,
    headerTitleStyle: { color: colors.label },
    headerBackButtonDisplayMode: 'minimal',
  }
}
