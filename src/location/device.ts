import * as Location from 'expo-location'

import { strings } from '@/strings'

import type { Place } from './place'

async function describe(latitude: number, longitude: number): Promise<string> {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
    const parts = [address?.city, address?.region, address?.country].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
  } catch {
    // Reverse geocoding is a convenience; coordinates alone are enough to work.
  }

  return strings.location.currentLocation
}

export async function requestDeviceLocation(): Promise<Place | null> {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (!permission.granted) return null

  const position = await Location.getCurrentPositionAsync({})
  const { latitude, longitude } = position.coords

  return {
    label: await describe(latitude, longitude),
    latitude,
    longitude,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source: 'device',
  }
}
