import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { MoreGroup } from '@/more/rows'
import { useStrings } from '@/strings'
import { usePalette } from '@/theme/store'

export interface MoreScreenProps {
  /** Already filtered by the route when a search is in progress. */
  groups: MoreGroup[]
}

export function MoreScreen({ groups }: MoreScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {groups.length === 0 ? <EmptyState message={strings.library.noResults} /> : null}
      {groups.map((group) => (
        <View key={group.title} className="gap-3">
          <Text
            className="text-xs font-semibold tracking-wide uppercase"
            style={{ color: palette.accent }}>
            {group.title}
          </Text>
          {group.rows.map((row) => (
            <Row key={row.title} href={row.href} title={row.title} detail={row.detail} />
          ))}
        </View>
      ))}
    </Screen>
  )
}
