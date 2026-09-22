import type { ReactElement } from 'react'
import { Stack } from 'expo-router/stack'
import { useState } from 'react'
import { useColorScheme } from 'react-native'

import { filterGroups, useMoreGroups } from '@/more/rows'
import { MoreScreen } from '@/screens/more'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

interface Thing {
  query: string
}

export default function MoreRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '' })
  const strings = useStrings()
  const palette = usePalette()
  const groups = useMoreGroups()
  useColorScheme()

  return (
    <>
      {/* One native search bar, opened from a button in the app bar on both
          platforms: Material's search action on Android, and on iOS 26 a
          magnifier in the navigation bar that expands into the field when
          pressed (`integratedButton`). Kept out of any bottom toolbar so it
          never competes with the tab bar. Older iOS shows an inline field. */}
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
      <MoreScreen groups={filterGroups(groups, thing.query)} />
    </>
  )
}
