// The theme preference, kept in plain localStorage under the same key the
// pre-paint script (`@ihsaanly/web/theme` THEME_SCRIPT, shipped as
// theme.js) reads before first paint — not behind the app's own storage
// seam, which the script cannot reach before React has even loaded.

import { migrateLegacyAccent } from '@ihsaanly/state/theme/legacy-accent'
import { readStored, storeValue } from '@ihsaanly/web/local-storage'
import { applyMode, THEME_KEY, THEME_MODES, type ThemeMode } from '@ihsaanly/web/theme'
import { useSyncExternalStore } from 'react'

/** Light, Dark or a named theme; System is stored as nothing. */
function isThemeMode(value: string | null): value is ThemeMode {
  return value !== 'system' && (THEME_MODES as readonly (string | null)[]).includes(value)
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

// An accent chosen before full themes becomes the theme it maps to, once.
migrateLegacyAccent(getThemePreference, setThemePreference)
