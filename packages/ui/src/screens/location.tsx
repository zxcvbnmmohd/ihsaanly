import type { Place } from '@ihsaanly/core/location/place'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { PlaceMap } from '../components/place-map'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { TextField } from '../components/text-field'
import { useUi } from '../provider'
import type { LocationProblem } from './onboarding'

export interface LocationScreenProps {
  place: Place | null
  deviceLabel: string | null
  query: string
  results: Place[]
  showNoResults: boolean
  /** True while the device is being asked, so the row can say so rather than sit there. */
  locating: boolean
  problem: LocationProblem
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onOpenSettings: () => void
  onSelect: (place: Place) => void
}

export function LocationScreen({
  place,
  deviceLabel,
  query,
  results,
  showNoResults,
  locating,
  problem,
  onQueryChange,
  onUseDevice,
  onOpenSettings,
  onSelect,
}: LocationScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-4 p-4">
      {place ? (
        <View className="gap-2">
          <PlaceMap
            latitude={place.latitude}
            longitude={place.longitude}
            accent={palette.accent}
            onAccent={palette.onAccent}
          />
          <Text className="font-semibold text-base" style={{ color: colors.label }}>
            {place.label}
          </Text>
        </View>
      ) : null}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.location.explanation}
      </Text>

      <Row
        title={locating ? strings.location.locating : strings.location.useDevice}
        detail={locating ? null : deviceLabel}
        onPress={locating ? undefined : onUseDevice}
      />

      {problem ? (
        <View className="gap-3">
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {problem === 'declined' ? strings.location.declined : strings.location.unavailable}
          </Text>
          {/* Declining is answered in system settings, and hunting for it is the
              part people give up on. The Reminders screen already offers this. */}
          {problem === 'declined' ? (
            <Row title={strings.notifications.openSettings} onPress={onOpenSettings} />
          ) : null}
        </View>
      ) : null}

      <TextField
        value={query}
        onChangeText={onQueryChange}
        placeholder={strings.location.search}
        label={strings.location.searchLabel}
        kind="search"
        returnKeyType="search"
      />

      {showNoResults ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.location.noResults}
        </Text>
      ) : null}

      <View className="gap-3">
        {results.map((result) => (
          <Row key={result.label} title={result.label} onPress={() => onSelect(result)} />
        ))}
      </View>

      <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
        {strings.location.attribution}
      </Text>
    </Screen>
  )
}
