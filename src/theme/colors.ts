import { Color } from 'expo-router'
import { Platform, type ColorSchemeName, type ColorValue } from 'react-native'

/**
 * Native semantic colors: UIKit on iOS, Material 3 dynamic (wallpaper-derived)
 * on Android, plain hex on web. Light/dark and accessibility contrast are the
 * OS's business, not ours.
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
    return Platform.select({
      ios: Color.ios.label,
      android: Color.android.dynamic.onSurface,
      default: '#000000',
    })
  },
  get secondaryLabel(): ColorValue {
    return Platform.select({
      ios: Color.ios.secondaryLabel,
      android: Color.android.dynamic.onSurfaceVariant,
      default: '#3c3c43',
    })
  },
  get separator(): ColorValue {
    return Platform.select({
      ios: Color.ios.separator,
      android: Color.android.dynamic.outlineVariant,
      default: '#c6c6c8',
    })
  },
  get systemBackground(): ColorValue {
    return Platform.select({
      ios: Color.ios.systemBackground,
      android: Color.android.dynamic.surface,
      default: '#ffffff',
    })
  },
  get secondarySystemBackground(): ColorValue {
    return Platform.select({
      ios: Color.ios.secondarySystemBackground,
      android: Color.android.dynamic.surfaceContainer,
      default: '#f2f2f7',
    })
  },
  get tint(): ColorValue {
    return Platform.select({
      ios: Color.ios.systemBlue,
      android: Color.android.dynamic.primary,
      default: '#007aff',
    })
  },
  get onTint(): ColorValue {
    return Platform.select({
      ios: Color.ios.systemBackground,
      android: Color.android.dynamic.onPrimary,
      default: '#ffffff',
    })
  },
}

export { palettes, type Palette } from './palettes'
import { palettes, type Palette } from './palettes'

export function paletteFor(scheme: ColorSchemeName | null): Palette {
  return palettes[scheme === 'dark' ? 'dark' : 'light']
}
