import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

import type { HomeRegion } from './store'

export const HOME_REGION_TASK = 'ihsaanly-home-region'

/** iOS monitors at most twenty regions; one is all this needs. */
const HOME_RADIUS_METRES = 150

export type HomeTransition = 'entering-home' | 'leaving-home' | null

let lastTransition: HomeTransition = null

export function currentHomeTransition(): HomeTransition {
  return lastTransition
}

// Registered at module scope because TaskManager requires it, and guarded
// because this file sits in Today's import chain: a failure here must not take
// the screen down with it.
try {
  TaskManager.defineTask(HOME_REGION_TASK, async ({ data, error }) => {
    if (error) return

    const region = data as { eventType?: Location.GeofencingEventType } | undefined
    if (!region) return

    lastTransition =
      region.eventType === Location.GeofencingEventType.Enter ? 'entering-home' : 'leaving-home'
  })
} catch {
  // Geofencing is unavailable here; home detection simply never fires.
}

export async function startHomeMonitoring(home: HomeRegion): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted) return false

  const background = await Location.requestBackgroundPermissionsAsync()
  if (!background.granted) return false

  await Location.startGeofencingAsync(HOME_REGION_TASK, [
    {
      latitude: home.latitude,
      longitude: home.longitude,
      radius: HOME_RADIUS_METRES,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ])

  return true
}

export async function stopHomeMonitoring(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(HOME_REGION_TASK)) {
    await Location.stopGeofencingAsync(HOME_REGION_TASK)
  }
}
