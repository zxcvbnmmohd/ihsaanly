import { requireOptionalNativeModule } from 'expo'

interface ThemeOverrideNative {
  setNightMode: (mode: 'system' | 'light' | 'dark') => void
  /**
   * The device's own night setting, unaffected by this app's override. React
   * Native caches the scheme and refreshes it from a context that has not been
   * recreated yet, so straight after an override its answer is the outgoing one.
   */
  getSystemNightMode: () => 'light' | 'dark'
}

/**
 * Android only. Persists the night mode where the process can read it at
 * start, and applies it. Absent on iOS and in Expo Go, so callers check.
 */
export const ThemeOverride = requireOptionalNativeModule<ThemeOverrideNative>('ThemeOverride')
