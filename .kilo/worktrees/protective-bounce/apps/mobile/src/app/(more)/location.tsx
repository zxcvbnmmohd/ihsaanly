import { searchCities } from '@ihsaanly/core/location/cities'
import type { Place } from '@ihsaanly/core/location/place'
import { LocationScreen } from '@ihsaanly/ui/screens/location'
import type { LocationProblem } from '@ihsaanly/ui/screens/onboarding'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { requestDeviceLocation } from '@/location/device'
import { setPlace, usePlace } from '@/location/store'

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
