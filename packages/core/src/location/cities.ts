import type { CityData } from 'city-timezones'

import type { Place } from './place'

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
  // biome-ignore lint/plugin: city-timezones is a large table, loaded lazily on first search.
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

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres between two points. */
function distanceKm(a: { latitude: number; longitude: number }, b: CityData): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.latitude)
  const dLon = toRad(b.lng - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * The city closest to a coordinate, for platforms with no reverse-geocoding
 * service of their own (the web companion): a device fix still resolves to a
 * readable label and a usable time zone, just from this same table rather
 * than a network call.
 */
export function nearestCity(latitude: number, longitude: number): Place | null {
  const nearest = allCities().reduce<{ city: CityData; distance: number } | null>(
    (closest, city) => {
      const distance = distanceKm({ latitude, longitude }, city)
      return !closest || distance < closest.distance ? { city, distance } : closest
    },
    null,
  )
  return nearest ? toPlace(nearest.city) : null
}
