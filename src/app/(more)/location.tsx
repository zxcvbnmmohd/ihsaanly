import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { useState } from 'react';

import { searchCities } from '@/location/cities';
import { requestDeviceLocation } from '@/location/device';
import type { Place } from '@/location/place';
import { setPlace, usePlace } from '@/location/store';
import { LocationScreen } from '@/screens/location';

const MINIMUM_QUERY_LENGTH = 2;

interface Thing {
  query: string;
  declined: boolean;
}

export default function LocationRoute(): ReactElement {
  const place = usePlace();
  const [thing, setThing] = useState<Thing>({ query: '', declined: false });

  const results = searchCities(thing.query);

  const choose = (chosen: Place): void => {
    setPlace(chosen);
    router.back();
  };

  const useDeviceLocation = async (): Promise<void> => {
    const located = await requestDeviceLocation();
    if (located) return choose(located);
    setThing((current) => ({ ...current, declined: true }));
  };

  return (
    <LocationScreen
      deviceLabel={place?.source === 'device' ? place.label : null}
      query={thing.query}
      results={results}
      showNoResults={thing.query.trim().length >= MINIMUM_QUERY_LENGTH && results.length === 0}
      declined={thing.declined}
      onQueryChange={(query) => setThing((current) => ({ ...current, query }))}
      onUseDevice={useDeviceLocation}
      onSelect={choose}
    />
  );
}
