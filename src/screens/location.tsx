import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { PlaceMap } from '@/components/place-map'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { TextField } from '@/components/text-field'
import type { Place } from '@/location/place'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface LocationScreenProps {
  place: Place | null
  deviceLabel: string | null
  query: string
  results: Place[]
  showNoResults: boolean
  problem: 'declined' | 'unavailable' | null
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onSelect: (place: Place) => void
}

export function LocationScreen({
  place,
  deviceLabel,
  query,
  results,
  showNoResults,
  problem,
  onQueryChange,
  onUseDevice,
  onSelect,
}: LocationScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen className="gap-4 p-4">
      {place ? (
        <View className="gap-2">
          <PlaceMap
            latitude={place.latitude}
            longitude={place.longitude}
            accent={palette.accent}
            onAccent={palette.onAccent}
          />
          <Text className="text-base font-semibold" style={{ color: colors.label }}>
            {place.label}
          </Text>
        </View>
      ) : null}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.location.explanation}
      </Text>

      <Row title={strings.location.useDevice} detail={deviceLabel} onPress={onUseDevice} />

      {problem ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {problem === 'declined' ? strings.location.declined : strings.location.unavailable}
        </Text>
      ) : null}

      <TextField
        value={query}
        onChangeText={onQueryChange}
        placeholder={strings.location.search}
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
