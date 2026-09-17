import { router } from 'expo-router';
import { useState } from 'react';

import { searchCities } from '@/location/cities';
import { requestDeviceLocation } from '@/location/device';
import type { Place } from '@/location/place';
import { setPlace, usePlace } from '@/location/store';
import { LocationScreen } from '@/screens/location';

const MINIMUM_QUERY_LENGTH = 2;

interface State {
  query: string;
  declined: boolean;
}

export default function LocationRoute() {
  const place = usePlace();
  const [state, setState] = useState<State>({ query: '', declined: false });

  const results = searchCities(state.query);

  const choose = (chosen: Place) => {
    setPlace(chosen);
    router.back();
  };

  const useDeviceLocation = async () => {
    const located = await requestDeviceLocation();
    if (located) return choose(located);
    setState((current) => ({ ...current, declined: true }));
  };

  return (
    <LocationScreen
      deviceLabel={place?.source === 'device' ? place.label : null}
      query={state.query}
      results={results}
      showNoResults={state.query.trim().length >= MINIMUM_QUERY_LENGTH && results.length === 0}
      declined={state.declined}
      onQueryChange={(query) => setState((current) => ({ ...current, query }))}
      onUseDevice={useDeviceLocation}
      onSelect={choose}
    />
  );
}
