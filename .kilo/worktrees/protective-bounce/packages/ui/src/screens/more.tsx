import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { EmptyState } from '../components/empty-state'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'
import type { MoreGroup } from '../types'

export interface MoreScreenProps {
  /** Already filtered by the route when a search is in progress. */
  groups: MoreGroup[]
}

export function MoreScreen({ groups }: MoreScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {groups.length === 0 ? <EmptyState message={strings.library.noResults} /> : null}
      {groups.map((group) => (
        <View key={group.title} className="gap-3">
          <Text
            className="font-semibold text-xs uppercase tracking-wide"
            style={{ color: colors.accent }}>
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
