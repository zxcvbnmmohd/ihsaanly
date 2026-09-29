// The web's version of apps/mobile/src/location/device.ts: `navigator.geolocation`
// instead of expo-location, and the nearest city in our own table instead of a
// reverse-geocoding service — there isn't one to call without a server, and
// this stays true to "never sent anywhere".
import { nearestCity } from '@ihsaanly/core/location/cities'
import type { Place } from '@ihsaanly/core/location/place'
import { getStrings } from '@ihsaanly/state/strings'

export type DeviceLocation =
  | { status: 'ok'; place: Place }
  | { status: 'declined' }
  | { status: 'unavailable' }

/** Matches the native timeout: a fix that takes longer than this is given up on. */
const FIX_TIMEOUT_MS = 12_000
/** An hour, the same tolerance apps/mobile/src/location/device.ts uses. */
const MAX_AGE_MS = 60 * 60 * 1000

export function requestDeviceLocation(): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    // The browser's own `timeout` does not count time spent waiting on a
    // permission prompt (Chrome on macOS can also wait on the system one), so
    // the card could sit on "Finding you" indefinitely without this.
    const guard = window.setTimeout(
      () => resolve({ status: 'unavailable' }),
      FIX_TIMEOUT_MS + 3_000,
    )
    if (!navigator.geolocation) {
      resolve({ status: 'unavailable' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(guard)
        try {
          const { latitude, longitude } = position.coords
          const nearest = nearestCity(latitude, longitude)
          resolve({
            status: 'ok',
            place: {
              label: nearest?.label ?? getStrings().location.currentLocation,
              latitude,
              longitude,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              source: 'device',
            },
          })
        } catch (error) {
          reject(error)
        }
      },
      (error) => {
        window.clearTimeout(guard)
        resolve({ status: error.code === error.PERMISSION_DENIED ? 'declined' : 'unavailable' })
      },
      { timeout: FIX_TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    )
  })
}
