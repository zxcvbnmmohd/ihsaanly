/** No React Native here, so a widget model can import the brand hex values. */
/**
 * The brand palette, and the only literal colours in the app. A gradient and a
 * brand hue cannot be expressed as PlatformColor, which has no notion of either.
 * Text, separators and surfaces still come from the semantic `colors` above, so
 * light, dark and contrast settings stay the OS's business.
 */
export interface Palette {
  wash: readonly [string, string]
  accent: string
  onAccent: string
  /** A switch knob reads as 'on' by being light in either theme, as it is on iOS. */
  knob: string
  /** Android cards: a warm veil over the wash instead of Material's grey surface-container. */
  surface: string
  /**
   * The Material tab indicator and press ripple. A tint rather than the accent
   * itself: a solid accent fills the pill and swallows the icon inside it.
   */
  indicator: string
  /** Widgets have no semantic colours, so text and cards there are literal too. */
  ink: string
  inkSecondary: string
  widgetSurface: string
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    wash: ['#f7f0e9', '#e8cdbd'],
    accent: '#a94a32',
    onAccent: '#fff6f0',
    knob: '#fffaf6',
    surface: 'rgba(255, 250, 246, 0.78)',
    indicator: 'rgba(169, 74, 50, 0.16)',
    ink: '#2b1f1a',
    inkSecondary: '#7a665c',
    widgetSurface: '#fffaf6',
  },
  dark: {
    wash: ['#1b1411', '#3a241d'],
    accent: '#e28c6f',
    onAccent: '#1d120d',
    knob: '#fffaf6',
    surface: 'rgba(255, 246, 240, 0.08)',
    indicator: 'rgba(226, 140, 111, 0.22)',
    ink: '#f7ece6',
    inkSecondary: '#bba89e',
    widgetSurface: '#2a1c17',
  },
}
