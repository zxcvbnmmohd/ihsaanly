// The design tokens every Ihsaanly app shares. This is the only place a brand
// colour or font stack is written down: theme.css and web.css are generated
// from it (`bun run generate`), and the mobile app reads the same values in
// JavaScript where a prop needs a raw colour (gradients, widgets, status bar).
// No React Native here, so any runtime can import it.

type Scheme = 'light' | 'dark'
type PerScheme = Record<Scheme, string>

/**
 * Brand colours, the same in every app. Each becomes a Tailwind colour:
 * `wash-top` → `bg-wash-top`, `text-wash-top` and so on.
 */
export const brand = {
  'wash-top': { light: '#f7f0e9', dark: '#1b1411' },
  'wash-bottom': { light: '#e8cdbd', dark: '#3a241d' },
  accent: { light: '#a94a32', dark: '#e28c6f' },
  /** Link text on the wash: the accent, deepened just enough for 4.5:1 there. */
  'accent-ink': { light: '#93402b', dark: '#eba088' },
  'on-accent': { light: '#fff6f0', dark: '#1d120d' },
  /** Cards and widgets: a warm paper, not a grey surface. */
  paper: { light: '#fffaf6', dark: '#2a1c17' },
  ink: { light: '#2b1f1a', dark: '#f7ece6' },
  /** Secondary text in the app. */
  'ink-secondary': { light: '#66564d', dark: '#bba89e' },
  /** Secondary text on the web, darkened to pass WCAG AA on the wash's deepest point. */
  'ink-soft': { light: '#66564d', dark: '#bba89e' },
  /** A switch knob reads as 'on' by being light in either theme, as it is on iOS. */
  knob: { light: '#fffaf6', dark: '#fffaf6' },
  /** Android cards and the web: a warm veil over the wash instead of a grey surface. */
  surface: { light: 'rgba(255, 250, 246, 0.78)', dark: 'rgba(255, 246, 240, 0.08)' },
  /** The tab indicator and press ripple: a tint of the accent, not the accent itself. */
  indicator: { light: 'rgba(169, 74, 50, 0.16)', dark: 'rgba(226, 140, 111, 0.22)' },
  rule: { light: 'rgba(43, 31, 26, 0.14)', dark: 'rgba(247, 236, 230, 0.16)' },
  /** The outline of an interactive control on the wash: 3:1 (WCAG 1.4.11), which `rule` is not. */
  'rule-strong': { light: '#7d6d63', dark: '#8c766c' },
  /** A text field's resting border, and an unmarked checkbox ring: 3:1 on the app's surfaces. */
  'field-border': { light: '#7c7c82', dark: '#6b6b70' },
  tint: { light: 'rgba(169, 74, 50, 0.1)', dark: 'rgba(226, 140, 111, 0.14)' },
} satisfies Record<string, PerScheme>

/**
 * The operating system's own semantic colours. On iOS each is a PlatformColor
 * the OS resolves (light, dark and contrast included). On Android the app
 * supplies Material 3 dynamic colours at runtime, because they are computed in
 * JavaScript, not named resources. On the web these fallbacks apply.
 */
export const system = {
  'system-label': { ios: 'label', web: { light: '#000000', dark: '#ffffff' } },
  'system-secondary-label': {
    ios: 'secondaryLabel',
    web: { light: '#3c3c43', dark: 'rgba(235, 235, 245, 0.6)' },
  },
  'system-separator': { ios: 'separator', web: { light: '#c6c6c8', dark: '#38383a' } },
  'system-background': { ios: 'systemBackground', web: { light: '#ffffff', dark: '#000000' } },
  'system-secondary-background': {
    ios: 'secondarySystemBackground',
    web: { light: '#f2f2f7', dark: '#1c1c1e' },
  },
  // Web fills a button with it under white text, so it is darker than iOS's systemBlue (4.5:1).
  'system-tint': { ios: 'systemBlue', web: { light: '#0062cc', dark: '#0a84ff' } },
  'system-on-tint': { ios: 'systemBackground', web: { light: '#ffffff', dark: '#000000' } },
} satisfies Record<string, { ios: string; web: PerScheme }>

export type SystemColor = keyof typeof system

/**
 * Font stacks. Native apps take one family: `native` names a bundled or
 * platform font. The web gets the whole stack.
 */
export const fonts = {
  serif: {
    web: "'Iowan Old Style', Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif",
    ios: 'Charter',
    android: 'serif',
  },
  arabic: {
    web: "'Amiri', 'Geeza Pro', 'Noto Naskh Arabic', serif",
    ios: 'Amiri-Regular',
    android: 'Amiri-Regular',
  },
  urdu: { web: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Amiri', 'Geeza Pro', serif" },
  japanese: {
    web: "'Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', 'Noto Serif JP', 'Noto Serif CJK JP', serif",
  },
  'chinese-hans': {
    web: "'Songti SC', 'STSong', 'Noto Serif SC', 'Noto Serif CJK SC', 'Source Han Serif SC', 'SimSun', serif",
  },
  'chinese-hant': {
    web: "'Songti TC', 'Noto Serif TC', 'Noto Serif HK', 'Noto Serif CJK TC', 'Source Han Serif TC', 'PMingLiU', serif",
  },
  devanagari: {
    web: "'Kohinoor Devanagari', 'Noto Serif Devanagari', 'Tiro Devanagari Hindi', 'Nirmala UI', 'Mangal', serif",
  },
} satisfies Record<string, { web: string; ios?: string; android?: string }>

/** The mobile app's JavaScript view of the brand colours. */
export interface Palette {
  wash: readonly [string, string]
  accent: string
  onAccent: string
  knob: string
  surface: string
  indicator: string
  ink: string
  inkSecondary: string
  widgetSurface: string
}

function paletteOf(scheme: Scheme): Palette {
  return {
    wash: [brand['wash-top'][scheme], brand['wash-bottom'][scheme]],
    accent: brand.accent[scheme],
    onAccent: brand['on-accent'][scheme],
    knob: brand.knob[scheme],
    surface: brand.surface[scheme],
    indicator: brand.indicator[scheme],
    ink: brand.ink[scheme],
    inkSecondary: brand['ink-secondary'][scheme],
    widgetSurface: brand.paper[scheme],
  }
}

export const palettes: Record<Scheme, Palette> = {
  light: paletteOf('light'),
  dark: paletteOf('dark'),
}
