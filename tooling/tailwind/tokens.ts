// The design tokens every Ihsaanly app shares. This is the only place a brand
// colour or font stack is written down: theme.css and web.css are generated
// from it (`bun run generate`), and the mobile app reads the same values in
// JavaScript where a prop needs a raw colour (gradients, widgets, status bar).
// No React Native here, so any runtime can import it.

export type Scheme = 'light' | 'dark'
type PerScheme = Record<Scheme, string>

/** `#a94a32` at 0.16 → `rgba(169, 74, 50, 0.16)`. */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

/**
 * Brand colours, the Light and Dark appearances (System picks between them).
 * Each becomes a Tailwind colour: `wash-top` → `bg-wash-top`, `text-wash-top`
 * and so on. A named theme (below) gives every one of these its own value.
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
  /** A text field's resting border, and an unmarked checkbox ring: 3:1 on the app's surfaces and the wash's deepest point. */
  'field-border': { light: '#717177', dark: '#85858a' },
  tint: { light: 'rgba(169, 74, 50, 0.1)', dark: 'rgba(226, 140, 111, 0.14)' },
} satisfies Record<string, PerScheme>

export type BrandColor = keyof typeof brand
export type ThemeColors = Record<BrandColor, string>

/**
 * The named themes, each a whole canvas in one fixed scheme: wash, paper,
 * cards, ink, borders and accent all change, not just the accent. Five are
 * dark and five light. Each passes WCAG AA on its own grounds (tokens.test.ts
 * checks it): ink and secondary ink 4.5:1 on the wash's top and bottom and on
 * paper, the accent and accent-ink 4.5:1 there too, on-accent 4.5:1 on the
 * accent, and the control outlines 3:1.
 */
export const THEMES = [
  'obsidian',
  'espresso',
  'midnight',
  'forest',
  'dusk',
  'ivory',
  'parchment',
  'sage',
  'rose',
  'sky',
] as const
export type ThemeName = (typeof THEMES)[number]

/** What a theme writes down; the veils and tints are derived from it. */
interface ThemeBase {
  scheme: Scheme
  washTop: string
  washBottom: string
  paper: string
  ink: string
  inkSecondary: string
  accent: string
  accentInk: string
  onAccent: string
  ruleStrong: string
  fieldBorder: string
}

const themeBases: Record<ThemeName, ThemeBase> = {
  /** Near-black with gold, the DeenDrops canvas without its warmth. */
  obsidian: {
    scheme: 'dark',
    washTop: '#0b0b0c',
    washBottom: '#1f1e22',
    paper: '#1a1a1d',
    ink: '#f2efe8',
    inkSecondary: '#a9a59d',
    accent: '#e3b65e',
    accentInk: '#ebc47a',
    onAccent: '#141210',
    ruleStrong: '#7a766f',
    fieldBorder: '#7d7a74',
  },
  /** Dark roast brown, cream ink and a caramel accent. */
  espresso: {
    scheme: 'dark',
    washTop: '#1e150d',
    washBottom: '#3a2a1c',
    paper: '#2c241c',
    ink: '#f3e6cc',
    inkSecondary: '#bcae96',
    accent: '#eaa874',
    accentInk: '#f0b98d',
    onAccent: '#1e150d',
    ruleStrong: '#8f7f6a',
    fieldBorder: '#958571',
  },
  /** Deep navy night with a periwinkle accent. */
  midnight: {
    scheme: 'dark',
    washTop: '#0c1226',
    washBottom: '#1d2850',
    paper: '#18213d',
    ink: '#e9edf8',
    inkSecondary: '#a9b3cc',
    accent: '#9fb5ff',
    accentInk: '#b6c6ff',
    onAccent: '#0c1226',
    ruleStrong: '#7380a3',
    fieldBorder: '#7884a8',
  },
  /** Pine-dark green with a mint accent. */
  forest: {
    scheme: 'dark',
    washTop: '#0d1a13',
    washBottom: '#1f3529',
    paper: '#192b21',
    ink: '#e7f1e9',
    inkSecondary: '#a4bbab',
    accent: '#8fd3a6',
    accentInk: '#a7debb',
    onAccent: '#0d1a13',
    ruleStrong: '#6d8a77',
    fieldBorder: '#72907c',
  },
  /** Aubergine after Maghrib with a soft rose accent. */
  dusk: {
    scheme: 'dark',
    washTop: '#1b1120',
    washBottom: '#38213f',
    paper: '#2b1b31',
    ink: '#f5e9f3',
    inkSecondary: '#c0aabd',
    accent: '#e8a0ca',
    accentInk: '#efb6d6',
    onAccent: '#1b1120',
    ruleStrong: '#8f7590',
    fieldBorder: '#957a96',
  },
  /** Clean off-white with near-black ink and an old-gold accent. */
  ivory: {
    scheme: 'light',
    washTop: '#fbf9f4',
    washBottom: '#ebe4d4',
    paper: '#ffffff',
    ink: '#1f1c17',
    inkSecondary: '#5b554b',
    accent: '#7a5816',
    accentInk: '#6b4d12',
    onAccent: '#fffdf7',
    ruleStrong: '#857d6e',
    fieldBorder: '#7a7468',
  },
  /** Aged paper, sepia ink and a rubricated red. */
  parchment: {
    scheme: 'light',
    washTop: '#f4ead3',
    washBottom: '#e2cfa6',
    paper: '#fbf4e4',
    ink: '#2e2416',
    inkSecondary: '#5a4c37',
    accent: '#8a2e1e',
    accentInk: '#7a281a',
    onAccent: '#fff7ea',
    ruleStrong: '#7a6a4f',
    fieldBorder: '#75664c',
  },
  /** Pale green with a deep leaf accent. */
  sage: {
    scheme: 'light',
    washTop: '#eef3ec',
    washBottom: '#d0dfca',
    paper: '#f8fbf6',
    ink: '#1c291e',
    inkSecondary: '#4a5b4c',
    accent: '#3d6843',
    accentInk: '#355c3a',
    onAccent: '#f6fbf3',
    ruleStrong: '#677a69',
    fieldBorder: '#687a69',
  },
  /** Blush with a deep rose accent. */
  rose: {
    scheme: 'light',
    washTop: '#fbf0f1',
    washBottom: '#f0d1d7',
    paper: '#fffafa',
    ink: '#2d1a1f',
    inkSecondary: '#634850',
    accent: '#a03752',
    accentInk: '#8d3048',
    onAccent: '#fff3f5',
    ruleStrong: '#8a6a72',
    fieldBorder: '#85676f',
  },
  /** Morning sky with a deep blue accent. */
  sky: {
    scheme: 'light',
    washTop: '#eef5fb',
    washBottom: '#cadcee',
    paper: '#fafcff',
    ink: '#15202c',
    inkSecondary: '#455567',
    accent: '#265b90',
    accentInk: '#21507e',
    onAccent: '#f2f7fd',
    ruleStrong: '#647589',
    fieldBorder: '#647487',
  },
}

function themeColorsOf(base: ThemeBase): ThemeColors {
  const dark = base.scheme === 'dark'
  return {
    'wash-top': base.washTop,
    'wash-bottom': base.washBottom,
    accent: base.accent,
    'accent-ink': base.accentInk,
    'on-accent': base.onAccent,
    paper: base.paper,
    ink: base.ink,
    'ink-secondary': base.inkSecondary,
    'ink-soft': base.inkSecondary,
    // Light in either scheme, as the brand's is: the paper of a light theme, the ink of a dark one.
    knob: dark ? base.ink : base.paper,
    // Cards: the theme's paper laid over its wash, as DeenDrops' raised cards are.
    surface: withAlpha(base.paper, dark ? 0.86 : 0.78),
    indicator: withAlpha(base.accent, dark ? 0.22 : 0.16),
    rule: withAlpha(base.ink, dark ? 0.16 : 0.14),
    'rule-strong': base.ruleStrong,
    'field-border': base.fieldBorder,
    tint: withAlpha(base.accent, dark ? 0.14 : 0.1),
  }
}

/** Each named theme: its fixed scheme and every brand colour. */
export interface ThemeTokens {
  scheme: Scheme
  colors: ThemeColors
}

export const themes = Object.fromEntries(
  THEMES.map((name) => [
    name,
    { scheme: themeBases[name].scheme, colors: themeColorsOf(themeBases[name]) },
  ]),
) as Record<ThemeName, ThemeTokens>

/**
 * The one appearance preference: System, Light and Dark (the brand's own
 * palettes, System following the device) and then the named themes.
 */
export const APPEARANCES = ['system', 'light', 'dark', ...THEMES] as const
export type AppearanceName = (typeof APPEARANCES)[number]
/** The brand's own three, which follow (System) or force (Light, Dark) a scheme. */
export const BRAND_APPEARANCES = ['system', 'light', 'dark'] as const

export function isTheme(value: string): value is ThemeName {
  return (THEMES as readonly string[]).includes(value)
}

/** The named theme an appearance chooses; none for System, Light and Dark. */
export function themeOf(appearance: AppearanceName): ThemeName | undefined {
  return isTheme(appearance) ? appearance : undefined
}

/** The scheme an appearance renders in: a theme's own, Light or Dark, else the system's. */
export function schemeOf(appearance: AppearanceName, system: Scheme): Scheme {
  if (isTheme(appearance)) return themes[appearance].scheme
  return appearance === 'system' ? system : appearance
}

/** Every brand colour for a scheme, or for a named theme (whose own scheme wins). */
export function colorsFor(scheme: Scheme, theme?: ThemeName): ThemeColors {
  if (theme) return themes[theme].colors
  return Object.fromEntries(
    Object.entries(brand).map(([name, value]) => [name, value[scheme]]),
  ) as ThemeColors
}

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

/** The mobile app's JavaScript view of the brand colours, for one scheme or theme. */
export interface Palette {
  /** The scheme it is drawn in: a theme's own, or the one asked for. */
  scheme: Scheme
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
  inkSoft: string
  paper: string
  widgetSurface: string
  rule: string
  ruleStrong: string
  fieldBorder: string
}

function paletteOf(scheme: Scheme, colors: ThemeColors): Palette {
  return {
    scheme,
    wash: [colors['wash-top'], colors['wash-bottom']],
    accent: colors.accent,
    accentInk: colors['accent-ink'],
    onAccent: colors['on-accent'],
    knob: colors.knob,
    surface: colors.surface,
    indicator: colors.indicator,
    tint: colors.tint,
    ink: colors.ink,
    inkSecondary: colors['ink-secondary'],
    inkSoft: colors['ink-soft'],
    paper: colors.paper,
    widgetSurface: colors.paper,
    rule: colors.rule,
    ruleStrong: colors['rule-strong'],
    fieldBorder: colors['field-border'],
  }
}

/** The brand's Light and Dark palettes. */
export const palettes: Record<Scheme, Palette> = {
  light: paletteOf('light', colorsFor('light')),
  dark: paletteOf('dark', colorsFor('dark')),
}

/** Built once, so the same theme always gives the same object. */
const themePalettes = Object.fromEntries(
  THEMES.map((name) => [name, paletteOf(themes[name].scheme, themes[name].colors)]),
) as Record<ThemeName, Palette>

/**
 * The palette to paint with: a named theme's when one is chosen (its scheme is
 * fixed, so `scheme` is then ignored), else the brand's for the scheme.
 */
export function paletteFor(scheme: Scheme, theme?: ThemeName): Palette {
  return theme ? themePalettes[theme] : palettes[scheme]
}

/**
 * Each theme's sibling in the other scheme, for wherever a theme needs its
 * opposite: a paper share card in the other scheme, the inverted toast.
 */
const COUNTERPARTS: Record<ThemeName, ThemeName> = {
  obsidian: 'ivory',
  espresso: 'parchment',
  midnight: 'sky',
  forest: 'sage',
  dusk: 'rose',
  ivory: 'obsidian',
  parchment: 'espresso',
  sky: 'midnight',
  sage: 'forest',
  rose: 'dusk',
}

export function counterpartOf(theme: ThemeName): ThemeName {
  return COUNTERPARTS[theme]
}

/**
 * A light and a dark palette that belong together: the brand's two, or a
 * theme and its counterpart, each in its own scheme.
 */
export function palettePair(theme?: ThemeName): Record<Scheme, Palette> {
  if (!theme) return palettes
  const own = themePalettes[theme]
  const other = themePalettes[COUNTERPARTS[theme]]
  return own.scheme === 'light' ? { light: own, dark: other } : { light: other, dark: own }
}

/**
 * The system colours a named theme stands in for. System, Light and Dark leave
 * text, separators and system fills to the OS (its contrast settings
 * included); a theme is a whole canvas, so its ink and paper take their place.
 */
export function themeSystemColors(theme: ThemeName): Record<SystemColor, string> {
  const colors = themes[theme].colors
  return {
    'system-label': colors.ink,
    'system-secondary-label': colors['ink-secondary'],
    'system-separator': colors.rule,
    'system-background': colors['wash-top'],
    'system-secondary-background': colors.paper,
    'system-tint': colors.accent,
    'system-on-tint': colors['on-accent'],
  }
}
