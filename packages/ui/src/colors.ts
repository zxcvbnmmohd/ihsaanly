import { brand, palettes } from '@ihsaanly/tailwind/tokens'
import type { ColorValue } from 'react-native'

import { useUi } from './provider'

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

export function useColors(): Colors {
  const { scheme, systemColors } = useUi()
  const palette = palettes[scheme]

  return {
    washTop: palette.wash[0],
    washBottom: palette.wash[1],
    accent: palette.accent,
    accentInk: brand['accent-ink'][scheme],
    onAccent: palette.onAccent,
    paper: brand.paper[scheme],
    ink: palette.ink,
    inkSecondary: palette.inkSecondary,
    inkSoft: brand['ink-soft'][scheme],
    knob: palette.knob,
    surface: palette.surface,
    indicator: palette.indicator,
    rule: brand.rule[scheme],
    ruleStrong: brand['rule-strong'][scheme],
    fieldBorder: brand['field-border'][scheme],
    tint: brand.tint[scheme],
    label: systemColors.label,
    secondaryLabel: systemColors.secondaryLabel,
    separator: systemColors.separator,
    systemBackground: systemColors.systemBackground,
    secondarySystemBackground: systemColors.secondarySystemBackground,
    systemTint: systemColors.tint,
    onTint: systemColors.onTint,
  }
}
