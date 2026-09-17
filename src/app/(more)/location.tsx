import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';

import { Row } from '@/components/row';
import { searchCities } from '@/location/cities';
import type { Place } from '@/location/place';
import { requestDeviceLocation } from '@/location/device';
import { setPlace, usePlace } from '@/location/store';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export default function LocationSettings() {
  useColorScheme();

  const place = usePlace();
  const [query, setQuery] = useState('');
  const [declined, setDeclined] = useState(false);

  const results = searchCities(query);

  function choose(chosen: Place) {
    setPlace(chosen);
    router.back();
  }

  async function useDeviceLocation() {
    const located = await requestDeviceLocation();
    if (located) return choose(located);
    setDeclined(true);
  }

  return (
    <ScrollView contentContainerClassName="gap-4 p-4" contentInsetAdjustmentBehavior="automatic">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.location.explanation}
      </Text>

      <Row
        title={strings.location.useDevice}
        detail={place?.source === 'device' ? place.label : null}
        onPress={useDeviceLocation}
      />

      {declined ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.location.declined}
        </Text>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={strings.location.search}
        placeholderTextColor={colors.secondaryLabel}
        autoCorrect={false}
        className="rounded-2xl px-4 py-3 text-base"
        style={{ backgroundColor: colors.secondarySystemBackground, color: colors.label }}
      />

      {query.trim().length >= 2 && results.length === 0 ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.location.noResults}
        </Text>
      ) : null}

      <View className="gap-3">
        {results.map((result) => (
          <Row key={result.label} title={result.label} onPress={() => choose(result)} />
        ))}
      </View>

      <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
        {strings.location.attribution}
      </Text>
    </ScrollView>
  );
}
