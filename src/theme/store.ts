import { Appearance } from 'react-native'
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
 * control back to the OS.
 */
export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? 'auto' : preference)
}

export function setThemePreference(preference: ThemePreference): void {
  store.set(preference)
  applyThemePreference(preference)
}
