import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation'

import type { Palette } from '@/theme/colors'

/**
 * React Navigation's colours: its own light or dark, and under a named theme
 * that theme's wash, ink and accent, so a screen's background and a header
 * behind the wash are the theme's rather than white or black.
 */
export function navigationTheme(
  scheme: 'light' | 'dark',
  palette: Palette,
  themed: boolean,
): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme
  if (!themed) return base
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.wash[0],
      card: palette.wash[0],
      text: palette.ink,
      border: palette.rule,
      notification: palette.accent,
    },
  }
}
