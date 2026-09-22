import type { ReactElement } from 'react'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useState } from 'react'

import { searchCities } from '@/location/cities'
import { requestDeviceLocation } from '@/location/device'
import type { Place } from '@/location/place'
import { setPlace, usePlace } from '@/location/store'
import type { LocationProblem } from '@/screens/onboarding'
import { LocationScreen } from '@/screens/location'

const MINIMUM_QUERY_LENGTH = 2

interface Thing {
  query: string
  locating: boolean
  problem: LocationProblem
}

export default function LocationRoute(): ReactElement {
  const place = usePlace()
  const [thing, setThing] = useState<Thing>({ query: '', locating: false, problem: null })

  const results = searchCities(thing.query)

  const choose = (chosen: Place): void => {
    setPlace(chosen)
    router.back()
  }

  const useDeviceLocation = (): void => {
    setThing((current) => ({ ...current, locating: true, problem: null }))
    requestDeviceLocation()
      .then((located) => {
        if (located.status === 'ok') return choose(located.place)
        setThing((current) => ({ ...current, locating: false, problem: located.status }))
      })
      .catch(() => {
        // Whatever the platform threw, the row must not stay on "Finding you".
        setThing((current) => ({ ...current, locating: false, problem: 'unavailable' }))
      })
  }

  return (
    <LocationScreen
      place={place}
      deviceLabel={place?.source === 'device' ? place.label : null}
      query={thing.query}
      results={results}
      showNoResults={thing.query.trim().length >= MINIMUM_QUERY_LENGTH && results.length === 0}
      locating={thing.locating}
      problem={thing.problem}
      onQueryChange={(query) => setThing((current) => ({ ...current, query }))}
      onUseDevice={useDeviceLocation}
      onOpenSettings={() => void Linking.openSettings()}
      onSelect={choose}
    />
  )
}
