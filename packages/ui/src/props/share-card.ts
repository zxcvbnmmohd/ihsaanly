// The share studio's choices and what they resolve to. Pure, so the card, the
// studio and the route that captures the picture agree on one shape.

import { assertNever } from '@ihsaanly/core/assert-never'
import type { ShareCardText } from '@ihsaanly/core/content/share-text'
import type { Palette } from '@ihsaanly/tailwind/tokens'

export const SHARE_STYLES = ['paper-light', 'paper-dark', 'accent'] as const
export type ShareStyle = (typeof SHARE_STYLES)[number]

export const SHARE_BACKGROUNDS = ['solid', 'transparent'] as const
export type ShareBackground = (typeof SHARE_BACKGROUNDS)[number]

export const SHARE_ASPECTS = ['story', 'square'] as const
export type ShareAspect = (typeof SHARE_ASPECTS)[number]

export interface ShareCardOptions {
  style: ShareStyle
  background: ShareBackground
  aspect: ShareAspect
}

export const DEFAULT_SHARE_OPTIONS: ShareCardOptions = {
  style: 'paper-light',
  background: 'solid',
  aspect: 'story',
}

/**
 * Where a card's colours come from: a light and a dark palette (the brand's,
 * or a named theme and its counterpart: `palettePair` in tokens.ts), and the
 * one in force for the accent style. Every style follows the chosen theme.
 */
export interface ShareCardPalettes {
  light: Palette
  dark: Palette
  current: Palette
}

/** The colours one card paints with. Raw hex from the tokens, never system colours. */
export interface ShareCardTheme {
  wash: readonly [string, string]
  ink: string
  inkSecondary: string
  accent: string
  /**
   * What the studio shows a transparent card against, so light ink is not
   * previewed on a light sheet. Not part of the picture.
   */
  backdrop: string
}

export function shareCardTheme(style: ShareStyle, palettes: ShareCardPalettes): ShareCardTheme {
  switch (style) {
    case 'paper-light':
      return paperTheme(palettes.light, palettes.dark)
    case 'paper-dark':
      return paperTheme(palettes.dark, palettes.light)
    case 'accent': {
      const { accent, onAccent } = palettes.current
      return {
        wash: [accent, accent],
        ink: onAccent,
        inkSecondary: onAccent,
        accent: onAccent,
        backdrop: accent,
      }
    }
    default:
      return assertNever(style)
  }
}

function paperTheme(palette: Palette, opposite: Palette): ShareCardTheme {
  return {
    wash: palette.wash,
    ink: palette.ink,
    inkSecondary: palette.inkSecondary,
    accent: palette.accent,
    backdrop: opposite.wash[0],
  }
}

/** The card's size in points. Captured at 1080 wide: 1080×1920 or 1080×1080. */
export function shareCardSize(aspect: ShareAspect): { width: number; height: number } {
  return aspect === 'story' ? { width: 360, height: 640 } : { width: 360, height: 360 }
}

export type ShareCardFit = 'regular' | 'compact' | 'small'

/**
 * How much the type steps down so a long dua still fits a fixed card. Counted
 * in characters, which is rough but stable: the square holds about half what
 * the story does.
 */
export function shareCardFit(card: ShareCardText, aspect: ShareAspect): ShareCardFit {
  const length =
    (card.arabic?.length ?? 0) +
    (card.transliteration?.length ?? 0) +
    (card.translation?.length ?? 0)
  const roomy = aspect === 'story' ? 360 : 160
  if (length <= roomy) return 'regular'
  if (length <= roomy * 2) return 'compact'
  return 'small'
}
