/**
 * expo-location as controllable state, with every export the app's location
 * code reads (a module's keys are fixed by whichever mock loads first, so the
 * mock is always the full surface). Call `installLocation()` in `beforeEach`.
 */
import { mock } from 'bun:test'

export interface FakeCoords {
  coords: { latitude: number; longitude: number }
}

export const location = {
  foreground: { granted: true },
  background: { granted: true },
  lastKnown: null as FakeCoords | null,
  current: (async () => ({
    coords: { latitude: 51.5, longitude: -0.12 },
  })) as () => Promise<unknown>,
  address: [{ city: 'London', region: 'England', country: 'UK' }] as unknown[] | Error,
  lastKnownCalls: [] as unknown[],
  currentCalls: [] as unknown[],
  started: [] as { task: string; regions: unknown[] }[],
  stopped: [] as string[],
  asked: [] as string[],
}

export function resetLocation(): void {
  location.foreground = { granted: true }
  location.background = { granted: true }
  location.lastKnown = null
  location.current = async () => ({ coords: { latitude: 51.5, longitude: -0.12 } })
  location.address = [{ city: 'London', region: 'England', country: 'UK' }]
  location.lastKnownCalls = []
  location.currentCalls = []
  location.started = []
  location.stopped = []
  location.asked = []
}

export function installLocation(): void {
  mock.module('expo-location', () => ({
    Accuracy: { Low: 2 },
    GeofencingEventType: { Enter: 1, Exit: 2 },
    requestForegroundPermissionsAsync: async () => {
      location.asked.push('foreground')
      return location.foreground
    },
    requestBackgroundPermissionsAsync: async () => {
      location.asked.push('background')
      return location.background
    },
    startGeofencingAsync: async (task: string, regions: unknown[]) => {
      location.started.push({ task, regions })
    },
    stopGeofencingAsync: async (task: string) => {
      location.stopped.push(task)
    },
    getLastKnownPositionAsync: async (options: unknown) => {
      location.lastKnownCalls.push(options)
      return location.lastKnown
    },
    getCurrentPositionAsync: (options: unknown) => {
      location.currentCalls.push(options)
      return location.current()
    },
    reverseGeocodeAsync: async () => {
      if (location.address instanceof Error) throw location.address
      return location.address
    },
  }))
}
