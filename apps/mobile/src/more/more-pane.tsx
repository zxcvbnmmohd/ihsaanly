import { useMoreGroups } from '@ihsaanly/state/more/rows'
import { useStrings } from '@ihsaanly/state/strings'
import { useLayout } from '@ihsaanly/ui/layout'
import { filterGroups } from '@ihsaanly/ui/props/more'
import { MoreScreen } from '@ihsaanly/ui/screens/more'
import { Stack, usePathname, useSegments } from 'expo-router'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { useColorScheme } from 'react-native'
import { cloudEnabled } from '@/cloud'
import { colors } from '@/theme/colors'
import { usePalette, useThemePreference } from '@/theme/store'

interface Thing {
  query: string
}

/**
 * The path under `(more)`, or `null` while some other tab is focused.
 * `useSegments`/`usePathname` are both global — off-screen they would
 * otherwise report whatever tab currently has focus — so `segments[0]`
 * (the group's own literal name) is what tells this tab's own state apart
 * from a stale read of another one.
 */
export function morePath(segments: string[], pathname: string): string[] | null {
  if (segments[0] !== '(more)') return null
  return pathname.split('/').filter(Boolean)
}

/**
 * The More list: search and the settings groups. Takes nothing and reads
 * its own stores, so both the compact route (`(more)/index.tsx`, rendered
 * inside the native `Stack`) and the regular/wide layout (the fixed list
 * pane beside the settings detail) render the same component.
 */
export function MorePane(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '' })
  const strings = useStrings()
  const palette = usePalette()
  const theme = useThemePreference()
  const groups = useMoreGroups(theme, cloudEnabled)
  const layout = useLayout()
  const segments = useSegments()
  const pathname = usePathname()
  useColorScheme()

  const parts = morePath(segments, pathname)
  const selectedHref =
    layout === 'compact' || !parts || parts.length === 0 ? null : `/${parts.join('/')}`

  return (
    <>
      {/* One native search bar, opened from a button in the app bar on both
          platforms — see Library for the same pattern. Only meaningful under
          the real Stack at compact; at regular/wide MoreScreen's own
          `searchable` field takes over instead. */}
      {layout === 'compact' ? (
        <Stack.SearchBar
          placeholder={strings.more.search}
          placement="integratedButton"
          allowToolbarIntegration={false}
          autoCapitalize="none"
          tintColor={palette.accent}
          textColor={colors.label}
          hintTextColor={colors.secondaryLabel}
          headerIconColor={colors.label}
          // Typed as string, but Android's SearchView hands over null on mount and on close.
          onChangeText={(event) => setThing({ query: event.nativeEvent.text ?? '' })}
          onCancelButtonPress={() => setThing({ query: '' })}
          onClose={() => setThing({ query: '' })}
        />
      ) : null}
      <MoreScreen
        groups={filterGroups(groups, thing.query)}
        searchable={
          layout === 'compact'
            ? undefined
            : {
                query: thing.query,
                onQueryChange: (query) => setThing({ query }),
                placeholder: strings.more.search,
              }
        }
        selectedHref={selectedHref}
      />
    </>
  )
}
