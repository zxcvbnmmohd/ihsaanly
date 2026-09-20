import { Appearance, Platform, useColorScheme } from 'react-native'
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
 * The scheme the app should render in. On Android the native Appearance
 * module reports the system scheme again right after an override, so the
 * preference is the source of truth and the OS is consulted only for System.
 */
export function useEffectiveColorScheme(): 'light' | 'dark' {
  const preference = useThemePreference()
  const system = useColorScheme()
  if (preference !== 'system') return preference
  return system === 'dark' ? 'dark' : 'light'
}

/** The brand palette for the scheme the app is actually rendering in. */
export function usePalette(): Palette {
  return paletteFor(useEffectiveColorScheme())
}
