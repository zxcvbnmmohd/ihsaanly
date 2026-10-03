/**
 * `use-plan.ts` needs to know whether the user is currently entering or
 * leaving home, but the geofence itself is expo-location and expo-task-manager
 * — native-only, and this package cannot depend on either. Mobile's geofence
 * module owns the real answer and registers it here at import time; nothing
 * else has ever called `setHomeTransitionSource`, so a web host (or a test)
 * that never imports mobile code keeps the default: no transition, ever.
 */
export type HomeTransition = 'entering-home' | 'leaving-home' | null

/** The default source: a host that never registers one never sees a transition. */
export function noHomeTransition(): HomeTransition {
  return null
}

let source: () => HomeTransition = noHomeTransition

export function setHomeTransitionSource(fn: () => HomeTransition): void {
  source = fn
}

export function currentHomeTransition(): HomeTransition {
  return source()
}
