import { router } from 'expo-router';
import { useState } from 'react';

import { searchCities } from '@/location/cities';
import { requestDeviceLocation } from '@/location/device';
import type { Place } from '@/location/place';
import { setPlace, usePlace } from '@/location/store';
import { LocationScreen } from '@/screens/location';

const MINIMUM_QUERY_LENGTH = 2;

export default function LocationRoute() {
  const place = usePlace();
  const [query, setQuery] = useState('');
  const [declined, setDeclined] = useState(false);

  const results = searchCities(query);

  const choose = (chosen: Place) => {
    setPlace(chosen);
    router.back();
  };

  const useDeviceLocation = async () => {
    const located = await requestDeviceLocation();
    if (located) return choose(located);
    setDeclined(true);
  };

  return (
    <LocationScreen
      deviceLabel={place?.source === 'device' ? place.label : null}
      query={query}
      results={results}
      showNoResults={query.trim().length >= MINIMUM_QUERY_LENGTH && results.length === 0}
      declined={declined}
      onQueryChange={setQuery}
      onUseDevice={useDeviceLocation}
      onSelect={choose}
    />
  );
}
