import { createPreferenceStore } from '@ihsaanly/state/storage/preference-store'
import { THEME_PREFERENCES, type ThemePreference } from '@ihsaanly/ui/types'
import { z } from 'zod'

/**
 * The stored appearance: System, Light, Dark or a named theme, synced as
 * `theme` (cloud/keys.ts). A name this build does not know, from a newer one,
 * reads as System. Its own module so `colors.ts` can read it without the
 * store's Appearance wiring, which itself reads `colors.ts`.
 */
export const themePreferenceStore = createPreferenceStore<ThemePreference>(
  'theme',
  z.enum(THEME_PREFERENCES),
  'system',
)
