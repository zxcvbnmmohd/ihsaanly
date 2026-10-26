import {
  type Palette,
  paletteFor,
  type ThemeName,
  themeSystemColors,
} from '@ihsaanly/tailwind/tokens'
import type { ColorValue } from 'react-native'

import { type SystemColors, useUi } from './provider'

/**
 * Every colour a screen paints with, for `style` props. On native, NativeWind 5
 * (RC) did not apply stylesheet colour variables: `text-accent` rendered
 * uncoloured on iOS, and a runtime VariableContextProvider changed nothing.
 * So colours come from tokens.ts and the host's system colours in JavaScript,
 * and Tailwind classes carry only layout and the type scale.
 */
export interface Colors {
  washTop: string
  washBottom: string
  accent: string
  accentInk: string
  onAccent: string
  paper: string
  ink: string
  inkSecondary: string
  inkSoft: string
  knob: string
  surface: string
  indicator: string
  rule: string
  ruleStrong: string
  fieldBorder: string
  tint: string
  /** The OS's own colours: PlatformColor on iOS, Material 3 on Android, hex on the web. */
  label: ColorValue
  secondaryLabel: ColorValue
  separator: ColorValue
  systemBackground: ColorValue
  secondarySystemBackground: ColorValue
  systemTint: ColorValue
  onTint: ColorValue
}

/** The palette being painted with: the named theme's, or the brand's for the scheme. */
export function usePalette(): Palette {
  const { scheme, theme } = useUi()
  return paletteFor(scheme, theme)
}

/**
 * The host's system colours, unless a named theme is chosen: a theme is a
 * whole canvas, so its ink, rule and paper stand in for the OS's label,
 * separator and fills (`themeSystemColors` in tokens.ts).
 */
function systemColorsOf(systemColors: SystemColors, theme: ThemeName | undefined): SystemColors {
  if (!theme) return systemColors
  const own = themeSystemColors(theme)
  return {
    label: own['system-label'],
    secondaryLabel: own['system-secondary-label'],
    separator: own['system-separator'],
    systemBackground: own['system-background'],
    secondarySystemBackground: own['system-secondary-background'],
    tint: own['system-tint'],
    onTint: own['system-on-tint'],
  }
}

/** The system colours to paint with, a named theme's own when one is chosen. */
export function useSystemColors(): SystemColors {
  const { theme, systemColors } = useUi()
  return systemColorsOf(systemColors, theme)
}

export function useColors(): Colors {
  const { scheme, theme, systemColors: host } = useUi()
  const palette = paletteFor(scheme, theme)
  const systemColors = systemColorsOf(host, theme)

  return {
    washTop: palette.wash[0],
    washBottom: palette.wash[1],
    accent: palette.accent,
    accentInk: palette.accentInk,
    onAccent: palette.onAccent,
    paper: palette.paper,
    ink: palette.ink,
    inkSecondary: palette.inkSecondary,
    inkSoft: palette.inkSoft,
    knob: palette.knob,
    surface: palette.surface,
    indicator: palette.indicator,
    rule: palette.rule,
    ruleStrong: palette.ruleStrong,
    fieldBorder: palette.fieldBorder,
    tint: palette.tint,
    label: systemColors.label,
    secondaryLabel: systemColors.secondaryLabel,
    separator: systemColors.separator,
    systemBackground: systemColors.systemBackground,
    secondarySystemBackground: systemColors.secondarySystemBackground,
    systemTint: systemColors.tint,
    onTint: systemColors.onTint,
  }
}
