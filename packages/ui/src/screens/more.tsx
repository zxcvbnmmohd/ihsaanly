import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { EmptyState } from '../components/empty-state'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { TextField } from '../components/text-field'
import { useUi } from '../provider'
import type { MoreGroup } from '../types'

export interface MoreScreenSearchable {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
}

export interface MoreScreenProps {
  /** Already filtered by the route when a search is in progress. */
  groups: MoreGroup[]
  /** Renders a search field at the top when set; the host owns the query. */
  searchable?: MoreScreenSearchable
  /** The row whose `href` matches renders `selected` — the active pane at regular/wide. */
  selectedHref?: string | null
}

export function MoreScreen({ groups, searchable, selectedHref }: MoreScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {searchable ? (
        <TextField
          value={searchable.query}
          onChangeText={searchable.onQueryChange}
          placeholder={searchable.placeholder}
          label={strings.more.searchLabel}
          kind="search"
          accent={colors.accent}
          autoCapitalize="none"
        />
      ) : null}
      {groups.length === 0 ? <EmptyState message={strings.library.noResults} /> : null}
      {groups.map((group) => (
        <View key={group.title} className="gap-3">
          <Text
            accessibilityRole="header"
            aria-level={2}
            className="font-semibold text-xs uppercase tracking-wide"
            style={{ color: colors.accent }}>
            {group.title}
          </Text>
          {group.rows.map((row) => (
            <Row
              key={row.title}
              href={row.href}
              title={row.title}
              detail={row.detail}
              selected={selectedHref != null && row.href === selectedHref}
            />
          ))}
        </View>
      ))}
    </Screen>
  )
}
