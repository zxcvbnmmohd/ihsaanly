import { searchCities } from '@ihsaanly/core/location/cities'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace, usePlace } from '@ihsaanly/state/location/store'
import { useStrings } from '@ihsaanly/state/strings'
import { LocationScreen } from '@ihsaanly/ui/screens/location'
import type { LocationProblem } from '@ihsaanly/ui/screens/onboarding'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { PageHeader } from '~/components/page-header'
import { requestDeviceLocation } from '~/platform/location'

export const Route = createFileRoute('/location')({ component: LocationRoute })

const MINIMUM_QUERY_LENGTH = 2

interface Thing {
  query: string
  locating: boolean
  problem: LocationProblem
}

function LocationRoute(): ReactElement {
  const strings = useStrings()
  const router = useRouter()
  const place = usePlace()
  const [thing, setThing] = useState<Thing>({ query: '', locating: false, problem: null })

  const results = searchCities(thing.query)

  const choose = (chosen: Place): void => {
    setPlace(chosen)
    router.history.back()
  }

  const useDeviceLocation = (): void => {
    setThing((current) => ({ ...current, locating: true, problem: null }))
    requestDeviceLocation()
      .then((located) => {
        if (located.status === 'ok') return choose(located.place)
        setThing((current) => ({ ...current, locating: false, problem: located.status }))
      })
      .catch(() => {
        setThing((current) => ({ ...current, locating: false, problem: 'unavailable' }))
      })
  }

  return (
    <>
      <PageHeader title={strings.location.title} />
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
        // No OS settings page a browser tab can open (capabilities.systemSettings
        // is off on web); declined access is recovered by searching instead, which
        // the screen already offers.
        onOpenSettings={() => {}}
        onSelect={choose}
      />
    </>
  )
}
