import { itemById, resolveText } from '@ihsaanly/core/content'
import type { Strings } from '@ihsaanly/core/strings/en'
import { useStrings } from '@ihsaanly/state/strings'
import { Panel } from '@ihsaanly/ui/components/panel'
import { useLayout } from '@ihsaanly/ui/layout'
import { router, Slot, usePathname, useSegments } from 'expo-router'
import { Stack } from 'expo-router/stack'
import type { ReactElement } from 'react'
import { View } from 'react-native'
import { LibraryPane, libraryPath } from '@/library/library-pane'
import { useStackScreenOptions } from '@/theme/stack'

// A deep link or notification tap into this stack still gets its index underneath,
// so Back returns to the tab's own screen instead of leaving the tab.
export const unstable_settings = { anchor: 'index' }

/**
 * The reader panel's title: the glossary's, the item's (looked up the same
 * way `item/[id].tsx` does), or the memorised item's — `null` at the group
 * index, where the panel does not render at all.
 */
function detailTitle(parts: string[] | null, strings: Strings): string | null {
  if (!parts || parts.length === 0) return null
  if (parts[0] === 'glossary') return strings.glossary.title
  if (parts[0] === 'item' && parts[1] === 'memorise') return strings.memorise.title
  if (parts[0] === 'item' && parts[1]) {
    const item = itemById(parts[1])
    return item ? (resolveText(item.title) ?? strings.notFound.title) : strings.notFound.title
  }
  return null
}

export default function LibraryLayout(): ReactElement {
  const strings = useStrings()
  const screenOptions = useStackScreenOptions()
  const layout = useLayout()
  const segments = useSegments()
  const pathname = usePathname()

  if (layout === 'compact') {
    return (
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: strings.library.title }} />
        <Stack.Screen name="glossary" options={{ title: strings.glossary.title }} />
      </Stack>
    )
  }

  // A nested `<Stack>` here cannot be limited to `glossary`/`item/*`: every
  // sibling file under `(library)/` — `index` included — automatically joins
  // whichever navigator this layout renders, whether or not it gets its own
  // `<Stack.Screen>`. Scoping it to the detail routes only would mean moving
  // them into their own route group, which would turn the compact Stack (kept
  // exactly as it is above) into a Stack-of-Stacks. `<Slot/>` renders just the
  // currently matched route with no header of its own, so it is mounted only
  // once something under `glossary`/`item` is actually selected; at the group
  // index it is left out entirely rather than rendering `index` a second time
  // next to the list pane.
  const parts = libraryPath(segments, pathname)
  const isIndex = !parts || parts.length === 0

  return (
    <View className="flex-1 flex-row">
      <LibraryPane />
      {isIndex ? null : (
        <Panel
          title={detailTitle(parts, strings) ?? strings.library.title}
          onClose={() => router.replace('/(library)')}>
          <Slot />
        </Panel>
      )}
    </View>
  )
}
