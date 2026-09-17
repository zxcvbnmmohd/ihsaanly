import { cityMapping, type CityData } from 'city-timezones'

import { Place } from './place'

const MINIMUM_QUERY_LENGTH = 2

function toPlace(city: CityData): Place {
  const parts = [city.city, city.province, city.country].filter(Boolean)

  return {
    label: parts.join(', '),
    latitude: city.lat,
    longitude: city.lng,
    timezone: city.timezone,
    source: 'city',
  }
}

export function searchCities(query: string, limit = 20): Place[] {
  const normalised = query.trim().toLowerCase()
  if (normalised.length < MINIMUM_QUERY_LENGTH) return []

  return cityMapping
    .filter((city) => city.city_ascii?.toLowerCase().startsWith(normalised))
    .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
    .slice(0, limit)
    .map(toPlace)
}
