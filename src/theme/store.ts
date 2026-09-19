import { Appearance, useColorScheme } from 'react-native'
import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

const store = createPreferenceStore<ThemePreference>('theme', z.enum(THEME_PREFERENCES), 'system')

export const useThemePreference = store.use
export const getThemePreference = store.get

/**
 * Every colour is a PlatformColor that resolves against the app's effective
 * interface style, so this one call re-colours the whole app. `'auto'` hands
 * control back to the OS. On Android the activity is recreated for the change
 * to reach its resources (see plugins/with-android-theme-recreation.js), so
 * a switch restarts the screen, as it does in most Android apps.
 */
export function applyThemePreference(preference: ThemePreference): void {
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
