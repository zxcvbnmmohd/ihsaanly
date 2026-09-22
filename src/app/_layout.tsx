import type { ReactElement } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import { NativeTabs } from 'expo-router/native-tabs'
import { StatusBar } from 'expo-status-bar'
import { Platform, Text, View } from 'react-native'

import { setContentLanguage } from '@/content'
import { useNotificationResponse } from '@/notifications/use-response'
import { languageOf } from '@/i18n/locale'
import { getLocale } from '@/i18n/store'
import { OnboardingFlow } from '@/onboarding/flow'
import { useOnboarding } from '@/onboarding/store'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import {
  applyThemePreference,
  getThemePreference,
  useEffectiveColorScheme,
  usePalette,
} from '@/theme/store'

import '../../global.css'

setContentLanguage(languageOf(getLocale()))
applyThemePreference(getThemePreference())

/**
 * Today is the app, so it is where the app opens.
 *
 * Verified on a device: neither trigger order nor `anchor` decides this. The
 * URL "/" resolves to the alphabetically first group that has an index, which
 * was (library). The group holding Today is named (home) so that it sorts
 * first. Parenthesised groups never appear in a URL, so this is invisible
 * outside the filesystem. `anchor` stays because it governs back behaviour.
 */
export const unstable_settings = { anchor: '(home)' }

/**
 * Expo Router renders this instead of a white screen when a render throws.
 * Without it, release builds show nothing and the cause is invisible.
 */
interface ErrorBoundaryProps {
  error: Error
  retry: () => Promise<void>
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps): ReactElement {
  const strings = useStrings()
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <Text className="text-xl font-semibold" style={{ color: colors.label }}>
        {strings.error.title}
      </Text>
      <Text selectable className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
        {error.message}
      </Text>
      <Text
        onPress={() => retry()}
        className="text-base font-semibold"
        style={{ color: colors.tint }}>
        {strings.error.retry}
      </Text>
    </View>
  )
}

export default function RootLayout(): ReactElement {
  const strings = useStrings()
  const colorScheme = useEffectiveColorScheme()
  const palette = usePalette()
  const onboarding = useOnboarding()
  useNotificationResponse(onboarding.completed)

  // Onboarding replaces the tab bar rather than sitting over it: there is
  // nothing to navigate to until it is done.
  if (!onboarding.completed) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <OnboardingFlow />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/*
        iOS 26 draws its own tab bar background and ignores `backgroundColor`;
        Android's is Material's grey surface, which sat under a warm app like a
        different one, so it takes the top of the wash. The indicator and ripple
        are a tint of the accent rather than the accent itself — filling the
        Material pill with a solid accent swallows the icon inside it.
      */}
      <NativeTabs
        tintColor={palette.accent}
        backgroundColor={Platform.OS === 'android' ? palette.wash[0] : undefined}
        indicatorColor={palette.indicator}
        rippleColor={palette.indicator}>
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon sf="sun.max.fill" md="today" />
          <NativeTabs.Trigger.Label>{strings.tabs.today}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(library)">
          <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
          <NativeTabs.Trigger.Label>{strings.tabs.library}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(more)">
          <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
          <NativeTabs.Trigger.Label>{strings.tabs.more}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}
