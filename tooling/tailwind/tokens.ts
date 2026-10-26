// The design tokens every Ihsaanly app shares. This is the only place a brand
// colour or font stack is written down: theme.css and web.css are generated
// from it (`bun run generate`), and the mobile app reads the same values in
// JavaScript where a prop needs a raw colour (gradients, widgets, status bar).
// No React Native here, so any runtime can import it.

type Scheme = 'light' | 'dark'
type PerScheme = Record<Scheme, string>

/**
 * The named accents a person can choose, independent of System / Light / Dark.
 * Terracotta is the brand's own and the default. The wash, paper and ink stay
 * the same under every accent; only the accent and what is derived from it
 * change. Each one passes WCAG AA on that wash in both schemes (tokens.test.ts
 * checks it): `accent` 4.5:1 on the wash's top and on paper and 3:1 on its
 * deepest point, `accent-ink` 4.5:1 everywhere on the wash, `on-accent` 4.5:1
 * on the accent.
 */
export const ACCENTS = [
  'terracotta',
  'amber',
  'sage',
  'teal',
  'denim',
  'indigo',
  'plum',
  'rose',
  'clay',
  'graphite',
] as const
export type AccentName = (typeof ACCENTS)[number]
export const DEFAULT_ACCENT: AccentName = 'terracotta'

/** An accent's own colours, before the tints derived from it. */
interface AccentBase {
  accent: PerScheme
  /** Link text on the wash: the accent, deepened just enough for 4.5:1 there. */
  'accent-ink': PerScheme
  'on-accent': PerScheme
}

const accentBases: Record<AccentName, AccentBase> = {
  terracotta: {
    accent: { light: '#a94a32', dark: '#e28c6f' },
    'accent-ink': { light: '#93402b', dark: '#eba088' },
    'on-accent': { light: '#fff6f0', dark: '#1d120d' },
  },
  amber: {
    accent: { light: '#8a5a12', dark: '#e3b65e' },
    'accent-ink': { light: '#7a4f0f', dark: '#ebc47a' },
    'on-accent': { light: '#fff8ec', dark: '#1e150d' },
  },
  sage: {
    accent: { light: '#4f6b45', dark: '#a3c293' },
    'accent-ink': { light: '#455e3c', dark: '#b4cfa6' },
    'on-accent': { light: '#f6fbf3', dark: '#131a10' },
  },
  teal: {
    accent: { light: '#1f6b6b', dark: '#6fc2bd' },
    'accent-ink': { light: '#1a5d5d', dark: '#88cfca' },
    'on-accent': { light: '#f0fbfa', dark: '#0c1918' },
  },
  denim: {
    accent: { light: '#2f5f8f', dark: '#86b3e0' },
    'accent-ink': { light: '#29537d', dark: '#9cc2e8' },
    'on-accent': { light: '#f2f7fd', dark: '#0d1724' },
  },
  indigo: {
    accent: { light: '#4a4fa3', dark: '#a3a8ec' },
    'accent-ink': { light: '#41458f', dark: '#b5b9f0' },
    'on-accent': { light: '#f5f5ff', dark: '#13132a' },
  },
  plum: {
    accent: { light: '#7d3f73', dark: '#d79acb' },
    'accent-ink': { light: '#6e3765', dark: '#e0aed6' },
    'on-accent': { light: '#fdf3fb', dark: '#1f1020' },
  },
  rose: {
    accent: { light: '#a33a55', dark: '#ec90a6' },
    'accent-ink': { light: '#90334b', dark: '#f1a7b9' },
    'on-accent': { light: '#fff3f5', dark: '#24100f' },
  },
  clay: {
    accent: { light: '#8c5a43', dark: '#d4a48c' },
    'accent-ink': { light: '#7c4f3b', dark: '#ddb49f' },
    'on-accent': { light: '#fff7f2', dark: '#1e140f' },
  },
  /** High contrast: near-black on the light wash, near-white on the dark. */
  graphite: {
    accent: { light: '#2b2b2e', dark: '#ececf0' },
    'accent-ink': { light: '#252528', dark: '#f4f4f6' },
    'on-accent': { light: '#ffffff', dark: '#141416' },
  },
}

/** `#a94a32` at 0.16 → `rgba(169, 74, 50, 0.16)`. */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

/** Every colour an accent decides, the tints included. */
export interface AccentTokens extends AccentBase {
  /** The tab indicator and press ripple: a tint of the accent, not the accent itself. */
  indicator: PerScheme
  tint: PerScheme
}

function accentTokens(base: AccentBase): AccentTokens {
  return {
    ...base,
    indicator: {
      light: withAlpha(base.accent.light, 0.16),
      dark: withAlpha(base.accent.dark, 0.22),
    },
    tint: { light: withAlpha(base.accent.light, 0.1), dark: withAlpha(base.accent.dark, 0.14) },
  }
}

export const accents = Object.fromEntries(
  ACCENTS.map((name) => [name, accentTokens(accentBases[name])]),
) as Record<AccentName, AccentTokens>

const terracotta = accents.terracotta

/**
 * Brand colours, the same in every app. Each becomes a Tailwind colour:
 * `wash-top` → `bg-wash-top`, `text-wash-top` and so on.
 */
export const brand = {
  'wash-top': { light: '#f7f0e9', dark: '#1b1411' },
  'wash-bottom': { light: '#e8cdbd', dark: '#3a241d' },
  accent: terracotta.accent,
  /** Link text on the wash: the accent, deepened just enough for 4.5:1 there. */
  'accent-ink': terracotta['accent-ink'],
  'on-accent': terracotta['on-accent'],
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
  indicator: terracotta.indicator,
  rule: { light: 'rgba(43, 31, 26, 0.14)', dark: 'rgba(247, 236, 230, 0.16)' },
  /** The outline of an interactive control on the wash: 3:1 (WCAG 1.4.11), which `rule` is not. */
  'rule-strong': { light: '#7d6d63', dark: '#8c766c' },
  /** A text field's resting border, and an unmarked checkbox ring: 3:1 on the app's surfaces and the wash's deepest point. */
  'field-border': { light: '#717177', dark: '#85858a' },
  tint: terracotta.tint,
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
 * The system around a widget, for the previews that draw one on a Home or Lock
 * Screen: not brand colours, so they never become Tailwind classes. The
 * wallpaper itself is the accent, lit from the top corner and shaded to its
 * foot; iOS dims it further in dark mode and behind the Lock Screen's clock.
 */
export const scene = {
  /** The Lock Screen's clock and widgets and the Home Screen's labels: white, as iOS draws them. */
  onWallpaper: '#ffffff',
  /** Secondary text on the Lock Screen: the same white, at iOS's vibrant secondary weight. */
  onWallpaperSecondary: 'rgba(255, 255, 255, 0.62)',
  /** The disc behind a round Lock Screen widget (AccessoryWidgetBackground). */
  accessory: 'rgba(255, 255, 255, 0.18)',
  glow: 'rgba(255, 255, 255, 0.22)',
  shade: { light: 'rgba(0, 0, 0, 0.32)', dark: 'rgba(0, 0, 0, 0.62)' },
  /** Behind the clock iOS darkens the wallpaper so white stays legible on any accent. */
  lockShade: 'rgba(0, 0, 0, 0.58)',
  /** The soft shadow iOS puts under white text on a wallpaper. */
  textShadow: 'rgba(0, 0, 0, 0.35)',
} as const

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
  accentInk: string
  onAccent: string
  knob: string
  surface: string
  indicator: string
  tint: string
  ink: string
  inkSecondary: string
  widgetSurface: string
}

function paletteOf(scheme: Scheme, accent: AccentTokens): Palette {
  return {
    wash: [brand['wash-top'][scheme], brand['wash-bottom'][scheme]],
    accent: accent.accent[scheme],
    accentInk: accent['accent-ink'][scheme],
    onAccent: accent['on-accent'][scheme],
    knob: brand.knob[scheme],
    surface: brand.surface[scheme],
    indicator: accent.indicator[scheme],
    tint: accent.tint[scheme],
    ink: brand.ink[scheme],
    inkSecondary: brand['ink-secondary'][scheme],
    widgetSurface: brand.paper[scheme],
  }
}

/** Built once, so the same scheme and accent always give the same object. */
const accentPalettes = Object.fromEntries(
  ACCENTS.map((name) => [
    name,
    { light: paletteOf('light', accents[name]), dark: paletteOf('dark', accents[name]) },
  ]),
) as Record<AccentName, Record<Scheme, Palette>>

/** The default accent's palettes. */
export const palettes: Record<Scheme, Palette> = accentPalettes[DEFAULT_ACCENT]

/** The palette for a scheme under a chosen accent; the default accent when none is given. */
export function paletteFor(scheme: Scheme, accent: AccentName = DEFAULT_ACCENT): Palette {
  return accentPalettes[accent][scheme]
}
