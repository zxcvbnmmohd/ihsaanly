/**
 * Fakes for the theme tests: expo-router's `Color` with distinguishable iOS and
 * Android values, a platform switch for react-native-web (whose
 * `Platform.select` ignores `OS`), and a controllable `Appearance`.
 */
import { mock } from 'bun:test'
import { Appearance, Platform } from 'react-native'
import { expoRouter } from './router'

export type OS = 'ios' | 'android' | 'web'

const originalSelect = Platform.select

/** Makes `Platform.select` and `Platform.OS` agree, as on a device. */
export function setOS(os: OS): void {
  Platform.OS = os as never
  Platform.select = ((spec: Record<string, unknown>) =>
    os in spec ? spec[os] : spec.default) as typeof Platform.select
}

export function restoreOS(): void {
  Platform.OS = 'web'
  Platform.select = originalSelect
}

const named = (prefix: string): Record<string, string> =>
  new Proxy({}, { get: (_target, key) => `${prefix}:${String(key)}` })

/** `Color.ios.label` is "ios:label"; `Color.android.dynamic.onSurface` is "android:onSurface". */
export function installColors(): void {
  mock.module('expo-router', () => ({
    ...expoRouter,
    Color: { ios: named('ios'), android: { dynamic: named('android') } },
  }))
}

export function restoreRouter(): void {
  mock.module('expo-router', () => expoRouter)
}

type Listener = (event: { colorScheme: string }) => void

export const appearance = {
  scheme: 'light' as 'light' | 'dark' | null,
  set: [] as unknown[],
  listeners: new Set<Listener>(),
  removed: 0,
}

interface Mutable {
  getColorScheme: () => unknown
  setColorScheme: (scheme: unknown) => void
  addChangeListener: (listener: Listener) => { remove: () => void }
}
const original = { ...(Appearance as unknown as Mutable) }

/** Replaces `Appearance` on the shared react-native-web object. */
export function installAppearance(): void {
  const target = Appearance as unknown as Mutable
  appearance.scheme = 'light'
  appearance.set = []
  appearance.listeners = new Set()
  appearance.removed = 0
  target.getColorScheme = () => appearance.scheme
  target.setColorScheme = (scheme) => {
    appearance.set.push(scheme)
  }
  target.addChangeListener = (listener) => {
    appearance.listeners.add(listener)
    return {
      remove: () => {
        appearance.removed += 1
        appearance.listeners.delete(listener)
      },
    }
  }
}

export function restoreAppearance(): void {
  Object.assign(Appearance as unknown as Mutable, original)
}
