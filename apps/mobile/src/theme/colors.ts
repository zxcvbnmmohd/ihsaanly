import { type SystemColor, themeOf, themeSystemColors } from '@ihsaanly/tailwind/tokens'
import { Color } from 'expo-router'
import { type ColorSchemeName, type ColorValue, Platform } from 'react-native'
import { themePreferenceStore } from './preference'

/**
 * A named theme's own colour for a system role, or null under System, Light
 * and Dark, which leave it to the OS. Read at each access, like the rest.
 */
function themed(role: SystemColor): string | null {
  const theme = themeOf(themePreferenceStore.get())
  return theme ? themeSystemColors(theme)[role] : null
}

/**
 * Native semantic colors: UIKit on iOS, Material 3 dynamic (wallpaper-derived)
 * on Android, plain hex on web. Light/dark and accessibility contrast are the
 * OS's business, not ours, except under a named theme, whose own ink, rule and
 * paper take each role (`themeSystemColors` in tokens.ts).
 *
 * These are getters on purpose. On iOS each value is a PlatformColor that the
 * OS re-resolves. On Android expo-router resolves the Material colour in JS,
 * synchronously, from `Appearance.getColorScheme()` at the moment the property
 * is read. A plain object would freeze every colour at import time, which is
 * why a component that reads `colors.*` must also call `useColorScheme()`: the
 * re-render is what re-reads the getter.
 */
export const colors = {
  get label(): ColorValue {
    return (
      themed('system-label') ??
      Platform.select({
        ios: Color.ios.label,
        android: Color.android.dynamic.onSurface,
        default: '#000000',
      })
    )
  },
  get secondaryLabel(): ColorValue {
    return (
      themed('system-secondary-label') ??
      Platform.select({
        ios: Color.ios.secondaryLabel,
        android: Color.android.dynamic.onSurfaceVariant,
        default: '#3c3c43',
      })
    )
  },
  get separator(): ColorValue {
    return (
      themed('system-separator') ??
      Platform.select({
        ios: Color.ios.separator,
        android: Color.android.dynamic.outlineVariant,
        default: '#c6c6c8',
      })
    )
  },
  get systemBackground(): ColorValue {
    return (
      themed('system-background') ??
      Platform.select({
        ios: Color.ios.systemBackground,
        android: Color.android.dynamic.surface,
        default: '#ffffff',
      })
    )
  },
  get secondarySystemBackground(): ColorValue {
    return (
      themed('system-secondary-background') ??
      Platform.select({
        ios: Color.ios.secondarySystemBackground,
        android: Color.android.dynamic.surfaceContainer,
        default: '#f2f2f7',
      })
    )
  },
  get tint(): ColorValue {
    return (
      themed('system-tint') ??
      Platform.select({
        ios: Color.ios.systemBlue,
        android: Color.android.dynamic.primary,
        default: '#0062cc',
      })
    )
  },
  get onTint(): ColorValue {
    return (
      themed('system-on-tint') ??
      Platform.select({
        ios: Color.ios.systemBackground,
        android: Color.android.dynamic.onPrimary,
        default: '#ffffff',
      })
    )
  },
}

export { type Palette, palettes } from './palettes'

import { type ThemeName, paletteFor as tokenPalette } from '@ihsaanly/tailwind/tokens'
import type { Palette } from './palettes'

/** The palette for a scheme (light when unknown), or a named theme's own. */
export function paletteFor(scheme: ColorSchemeName | null, theme?: ThemeName): Palette {
  return tokenPalette(scheme === 'dark' ? 'dark' : 'light', theme)
}
