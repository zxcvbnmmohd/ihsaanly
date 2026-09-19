import * as Location from 'expo-location'

import { getStrings } from '@/strings'

import type { Place } from './place'

async function describe(latitude: number, longitude: number): Promise<string> {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
    const parts = [address?.city, address?.region, address?.country].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
  } catch {
    // Reverse geocoding is a convenience; coordinates alone are enough to work.
  }

  return getStrings().location.currentLocation
}

export type DeviceLocation =
  { status: 'ok'; place: Place } | { status: 'declined' } | { status: 'unavailable' }

/**
 * Location services being switched off throws rather than resolving, so the
 * failure is caught here and named. Declining is a supported path, not an
 * error — the city list covers it.
 */
export async function requestDeviceLocation(): Promise<DeviceLocation> {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (!permission.granted) return { status: 'declined' }

  try {
    const position = await Location.getCurrentPositionAsync({})
    const { latitude, longitude } = position.coords

    return {
      status: 'ok',
      place: {
        label: await describe(latitude, longitude),
        latitude,
        longitude,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: 'device',
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}
