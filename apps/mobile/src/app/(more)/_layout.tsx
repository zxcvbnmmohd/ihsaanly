import { useMoreGroups } from '@ihsaanly/state/more/rows'
import { useStrings } from '@ihsaanly/state/strings'
import { useLayout } from '@ihsaanly/ui/layout'
import { type Href, router, Slot, usePathname, useSegments } from 'expo-router'
import { Stack } from 'expo-router/stack'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useColorScheme, View } from 'react-native'
import { cloudEnabled } from '@/cloud'
import { MorePane, morePath } from '@/more/more-pane'
import { colors } from '@/theme/colors'
import { useStackScreenOptions } from '@/theme/stack'
import { useThemePreference } from '@/theme/store'

// A deep link or notification tap into this stack still gets its index underneath,
// so Back returns to the tab's own screen instead of leaving the tab.
export const unstable_settings = { anchor: 'index' }

// Matches `Panel`'s own regular/wide widths (`packages/ui/src/components/panel.tsx`)
// so the list sidebar keeps the same rhythm as Library's reader panel, even
// though More's own detail area is a plain flexible column rather than a Panel.
const LIST_WIDTH = { regular: 420, wide: 480 } as const

export default function MoreLayout(): ReactElement {
  const strings = useStrings()
  const screenOptions = useStackScreenOptions()
  const layout = useLayout()
  const segments = useSegments()
  const pathname = usePathname()
  const theme = useThemePreference()
  const groups = useMoreGroups(theme, cloudEnabled)
  useColorScheme()

  const parts = morePath(segments, pathname)
  const isIndex = !parts || parts.length === 0
  const firstHref = groups[0]?.rows[0]?.href ?? null

  // The group index has nothing of its own to show beside the list at
  // regular/wide, so it steps aside for the first settings row instead of
  // leaving the detail column empty. `(more)/index.tsx` never actually
  // mounts in that case (see the `<Slot/>` note below), so the redirect has
  // to live here, in the always-mounted layout, rather than in the route file.
  useEffect(() => {
    if (layout === 'compact' || !isIndex || !firstHref) return
    router.replace(firstHref as Href)
  }, [layout, isIndex, firstHref])

  if (layout === 'compact') {
    return (
      <Stack screenOptions={screenOptions}>
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
        <Stack.Screen name="diagnostics" options={{ title: strings.diagnostics.title }} />
        <Stack.Screen name="language" options={{ title: strings.language.title }} />
        <Stack.Screen name="appearance" options={{ title: strings.appearance.title }} />
        {cloudEnabled ? (
          <Stack.Screen name="account" options={{ title: strings.account.title }} />
        ) : null}
        <Stack.Screen name="about" options={{ title: strings.about.title }} />
      </Stack>
    )
  }

  // Same constraint as Library: a nested `<Stack>` cannot be limited to the
  // thirteen settings routes without excluding `index`, since every sibling
  // file automatically joins whichever navigator this layout renders. `<Slot/>`
  // is mounted only once a settings row is selected; at the group index the
  // effect above replaces it with the first row before this ever matters.
  return (
    <View className="flex-1 flex-row">
      <View style={{ width: LIST_WIDTH[layout] }}>
        <MorePane />
      </View>
      {isIndex ? null : (
        <View className="flex-1 border-s" style={{ borderColor: colors.separator }}>
          <Slot />
        </View>
      )}
    </View>
  )
}
