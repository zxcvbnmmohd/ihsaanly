import { requireOptionalNativeModule } from 'expo'

interface ThemeOverrideNative {
  setNightMode: (mode: 'system' | 'light' | 'dark') => void
}

/**
 * Android only. Persists the night mode where the process can read it at
 * start, and applies it. Absent on iOS and in Expo Go, so callers check.
 */
export const ThemeOverride = requireOptionalNativeModule<ThemeOverrideNative>('ThemeOverride')
