import { useSyncExternalStore } from 'react'
import { Appearance, Platform } from 'react-native'
import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'
import { paletteFor, type Palette } from '@/theme/colors'

import { ThemeOverride } from '../../modules/theme-override'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

const store = createPreferenceStore<ThemePreference>('theme', z.enum(THEME_PREFERENCES), 'system')

export const useThemePreference = store.use
export const getThemePreference = store.get

/**
 * On Android the local theme-override module persists the mode where the
 * process reads it at start, so a cold start opens in the right scheme with no
 * relaunch; a live change still recreates the activity, as most Android apps
 * do (see plugins/with-android-manifest.js). Elsewhere, and in Expo Go where
 * the module is absent, Appearance handles it; `'auto'` hands control back to
 * the OS.
 */
export function applyThemePreference(preference: ThemePreference): void {
  // Persist for the next cold start. Android only; elsewhere the module is absent.
  if (Platform.OS === 'android' && ThemeOverride) ThemeOverride.setNightMode(preference)

  // Apply now. This must run on every platform even when the module already
  // applied the same mode natively: React Native caches the scheme in
  // JavaScript and only this call refreshes it, and that context survives the
  // Android activity recreation. Skipping it leaves every colors.* getter
  // resolving to the previous scheme. Setting the same mode twice is a no-op.
  Appearance.setColorScheme(preference === 'system' ? 'auto' : preference)
}

export function setThemePreference(preference: ThemePreference): void {
  store.set(preference)
  applyThemePreference(preference)
}

/**
 * Hoisted, never inline: `useSyncExternalStore` resubscribes whenever this
 * identity changes.
 */
function subscribeToScheme(listener: () => void): () => void {
  const subscription = Appearance.addChangeListener(listener)
  return (): void => subscription.remove()
}

/**
 * The device's own setting, asked of the system rather than of React Native's
 * cache.
 *
 * `Appearance.setColorScheme('auto')` caches `getColorScheme()` the instant it
 * is called, and on Android that reads a context `AppCompatDelegate` has not
 * recreated yet — so the cache keeps the scheme being left behind. No change
 * event follows, because as far as the OS is concerned nothing changed; only
 * this app's override did. That is why Dark to System left the app dark under a
 * light system. The native module reads the system configuration, which an
 * override never touches, so it is right at exactly the moment the cache is not.
 */
function systemScheme(): 'light' | 'dark' {
  if (Platform.OS === 'android' && ThemeOverride) {
    return ThemeOverride.getSystemNightMode() === 'dark' ? 'dark' : 'light'
  }
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

/**
 * The scheme the app should render in. An explicit preference is its own
 * answer; System asks the device.
 *
 * Through `useSyncExternalStore` rather than `useColorScheme` because this
 * reads mutable state from outside React, which React Compiler would otherwise
 * be free to memoise. The snapshot is a string, so referential stability is
 * free.
 */
export function useEffectiveColorScheme(): 'light' | 'dark' {
  const preference = useThemePreference()
  const system = useSyncExternalStore(subscribeToScheme, systemScheme, systemScheme)
  return preference === 'system' ? system : preference
}

/** The brand palette for the scheme the app is actually rendering in. */
export function usePalette(): Palette {
  return paletteFor(useEffectiveColorScheme())
}
