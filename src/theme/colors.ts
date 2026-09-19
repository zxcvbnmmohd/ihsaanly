import { Color } from 'expo-router'
import { Platform, type ColorSchemeName } from 'react-native'

/**
 * Native semantic colors: UIKit on iOS, Material 3 dynamic (wallpaper-derived)
 * on Android, plain hex on web. They resolve on-device, so light/dark and
 * accessibility contrast settings are handled by the OS, not by us.
 */
export const colors = {
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#000000',
  }),
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c43',
  }),
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#c6c6c8',
  }),
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#ffffff',
  }),
  secondarySystemBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#f2f2f7',
  }),
  tint: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: '#007aff',
  }),
  onTint: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.onPrimary,
    default: '#ffffff',
  }),
}

/**
 * Onboarding's warm editorial palette, and the only literal colours in the
 * app. LinearGradient and the star artwork need strings, and PlatformColor
 * cannot express a brand hue. Nothing on Today uses this; the spec keeps the
 * home screen undecorated.
 */
export interface Palette {
  wash: readonly [string, string]
  accent: string
  onAccent: string
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: { wash: ['#f7f0e9', '#e8cdbd'], accent: '#a94a32', onAccent: '#fff6f0' },
  dark: { wash: ['#1b1411', '#3a241d'], accent: '#e28c6f', onAccent: '#1d120d' },
}

export function paletteFor(scheme: ColorSchemeName | null): Palette {
  return palettes[scheme === 'dark' ? 'dark' : 'light']
}
