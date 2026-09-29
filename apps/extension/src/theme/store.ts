// The theme preference, kept in plain localStorage under the same key the
// pre-paint script (`@ihsaanly/web/theme` THEME_SCRIPT, shipped as
// theme.js) reads before first paint — not behind the app's own storage
// seam, which the script cannot reach before React has even loaded.
import { readStored, storeValue } from '@ihsaanly/web/local-storage'
import { applyMode, THEME_KEY, type ThemeMode } from '@ihsaanly/web/theme'
import { useSyncExternalStore } from 'react'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function read(): ThemeMode {
  const stored = readStored(THEME_KEY)
  return isThemeMode(stored) ? stored : 'system'
}

let current = read()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function getThemePreference(): ThemeMode {
  return current
}

export function setThemePreference(mode: ThemeMode): void {
  current = mode
  storeValue(THEME_KEY, mode === 'system' ? null : mode)
  applyMode(mode)
  listeners.forEach((listener) => listener())
}

export function useThemePreference(): ThemeMode {
  return useSyncExternalStore(subscribe, getThemePreference)
}
