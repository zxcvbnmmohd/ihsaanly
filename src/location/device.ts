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
 * A fix can take a long time indoors, or never arrive, and the platform call
 * has no timeout of its own. Without this the button that asked stays on
 * "Finding you" forever and the only way out is to pick a city.
 */
const FIX_TIMEOUT_MS = 12_000
/**
 * An hour. Prayer windows shift over tens of kilometres, so a fix from within
 * the hour is as good as a fresh one, and reusing it means no GPS wake-up and
 * no wait. Anything older falls through to a new fix.
 */
const LAST_KNOWN_MAX_AGE_MS = 60 * 60 * 1000

function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('location timed out')), FIX_TIMEOUT_MS)
  })

  return Promise.race([work, expiry]).finally(() => clearTimeout(timer))
}

/**
 * Location services being switched off throws rather than resolving, so the
 * failure is caught here and named. Declining is a supported path, not an
 * error — the city list covers it.
 */
export async function requestDeviceLocation(): Promise<DeviceLocation> {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (!permission.granted) return { status: 'declined' }

  try {
    // A fix the phone already has answers instantly and is plenty: prayer windows
    // move over tens of kilometres, not over the few hundred metres someone walks
    // in a quarter of an hour. Only when there is no recent one is a fresh fix
    // requested, at low accuracy, which is the "rough location" the policy promises.
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })))
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
