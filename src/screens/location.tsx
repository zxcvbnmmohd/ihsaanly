import type { ReactElement } from 'react';
import { Text, TextInput, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import type { Place } from '@/location/place';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export interface LocationScreenProps {
  deviceLabel: string | null;
  query: string;
  results: Place[];
  showNoResults: boolean;
  declined: boolean;
  onQueryChange: (query: string) => void;
  onUseDevice: () => void;
  onSelect: (place: Place) => void;
}

export function LocationScreen({
  deviceLabel,
  query,
  results,
  showNoResults,
  declined,
  onQueryChange,
  onUseDevice,
  onSelect,
}: LocationScreenProps): ReactElement {
  useColorScheme();

  return (
    <Screen className="gap-4 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.location.explanation}
      </Text>

      <Row title={strings.location.useDevice} detail={deviceLabel} onPress={onUseDevice} />

      {declined ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.location.declined}
        </Text>
      ) : null}

      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder={strings.location.search}
        placeholderTextColor={colors.secondaryLabel}
        autoCorrect={false}
        className="rounded-2xl px-4 py-3 text-base"
        style={{ backgroundColor: colors.secondarySystemBackground, color: colors.label }}
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
  );
}
