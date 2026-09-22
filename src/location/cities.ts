import type { CityData } from 'city-timezones'

import { Place } from './place'

const MINIMUM_QUERY_LENGTH = 2

let cities: CityData[] | null = null

/**
 * `city-timezones` is a 1.9 MB JSON table. Imported at the top it is parsed
 * during bundle evaluation on every cold start, including the many launches
 * that never open a search field — and `_layout.tsx` pulls the onboarding flow
 * in unconditionally, so every launch paid for it. Requiring it on the first
 * keystroke instead costs one frame in the one place it is wanted.
 *
 * `require` rather than `import()`: this is called during render and has to
 * stay synchronous. ponytail: a module-level cache, not a memoisation library.
 */
function allCities(): CityData[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cities ??= (require('city-timezones') as { cityMapping: CityData[] }).cityMapping
  return cities
}

function toPlace(city: CityData): Place {
  const parts = [city.city, city.province, city.country].filter(Boolean)

  return {
    label: parts.join(', '),
    latitude: city.lat,
    longitude: city.lng,
    timeZone: city.timezone,
    source: 'city',
  }
}

export function searchCities(query: string, limit = 20): Place[] {
  const normalised = query.trim().toLowerCase()
  if (normalised.length < MINIMUM_QUERY_LENGTH) return []

  return allCities()
    .filter((city) => city.city_ascii?.toLowerCase().startsWith(normalised))
    .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
    .slice(0, limit)
    .map(toPlace)
}
