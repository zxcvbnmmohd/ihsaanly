import { setHomeTransitionSource } from '@ihsaanly/state/events/home-transition'
import type { HomeRegion } from '@ihsaanly/state/events/store'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

export const HOME_REGION_TASK = 'ihsaanly-home-region'

/** iOS monitors at most twenty regions; one is all this needs. */
const HOME_RADIUS_METRES = 150

export type HomeTransition = 'entering-home' | 'leaving-home' | null

let lastTransition: HomeTransition = null

export function currentHomeTransition(): HomeTransition {
  return lastTransition
}

// @ihsaanly/state cannot import expo-location or expo-task-manager itself, so
// use-plan.ts reads this through the registration instead of importing the
// module directly.
setHomeTransitionSource(currentHomeTransition)

/** The task body: remembers whether the last region event was entering or leaving home. */
export async function onHomeRegionEvent({
  data,
  error,
}: {
  data?: unknown
  error?: unknown
}): Promise<void> {
  if (error) return

  const region = data as { eventType?: Location.GeofencingEventType } | undefined
  if (!region) return

  lastTransition =
    region.eventType === Location.GeofencingEventType.Enter ? 'entering-home' : 'leaving-home'
}

// Called at module scope because TaskManager requires registration there, and
// guarded because this file sits in Today's import chain: a failure here must
// not take the screen down with it.
export function registerHomeRegionTask(): void {
  try {
    TaskManager.defineTask(HOME_REGION_TASK, onHomeRegionEvent)
  } catch {
    // Geofencing is unavailable here; home detection simply never fires.
  }
}

registerHomeRegionTask()

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
