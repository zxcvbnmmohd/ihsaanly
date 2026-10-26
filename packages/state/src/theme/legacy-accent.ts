import type { ThemeName, ThemePreference } from '@ihsaanly/ui/types'
import { z } from 'zod'
import { deletePreferenceRows, readPreferenceRow } from '../storage/backend'
import { readPreference } from '../storage/preferences'

/**
 * The `accent` preference that came before full themes (2026-10). Each named
 * accent lands on the theme of the same family in the scheme it was used with.
 * Terracotta was the brand's own and lands nowhere: Light and Dark already are it.
 */
const ACCENT_THEMES: Record<string, Record<'light' | 'dark', ThemeName>> = {
  amber: { light: 'ivory', dark: 'obsidian' },
  graphite: { light: 'ivory', dark: 'obsidian' },
  clay: { light: 'parchment', dark: 'espresso' },
  sage: { light: 'sage', dark: 'forest' },
  teal: { light: 'sage', dark: 'forest' },
  denim: { light: 'sky', dark: 'midnight' },
  indigo: { light: 'sky', dark: 'midnight' },
  plum: { light: 'rose', dark: 'dusk' },
  rose: { light: 'rose', dark: 'dusk' },
}

const LEGACY_KEY = 'accent'

/**
 * What an appearance becomes given the accent chosen beside it. Only an
 * explicit Light or Dark takes a theme: a theme fixes its scheme, so mapping
 * under System would stop it following the device, and System is kept (the
 * accent is dropped). A theme already chosen stays, as does anything with no
 * accent, Terracotta or one this build does not know.
 */
export function migratedAppearance(
  preference: ThemePreference,
  accent: string | null,
): ThemePreference {
  if (preference !== 'light' && preference !== 'dark') return preference
  return (accent ? ACCENT_THEMES[accent]?.[preference] : undefined) ?? preference
}

/**
 * Folds a stored pre-themes accent into the host's appearance preference, once:
 * the accent row is deleted, so the next launch finds nothing to do. The host
 * owns its theme store (mobile's is synced, the web's is localStorage), so it
 * passes its getter and setter.
 */
export function migrateLegacyAccent(
  get: () => ThemePreference,
  set: (preference: ThemePreference) => void,
): void {
  if (!readPreferenceRow(LEGACY_KEY)) return
  // A row that is not a name (hand-edited, half-written) is dropped like Terracotta.
  const accent = readPreference(LEGACY_KEY, z.string())
  const current = get()
  const next = migratedAppearance(current, accent)
  if (next !== current) set(next)
  deletePreferenceRows([LEGACY_KEY])
}
