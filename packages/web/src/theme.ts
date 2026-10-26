import {
  APPEARANCES,
  type AppearanceName,
  BRAND_APPEARANCES,
  brand,
  isTheme,
  type Scheme,
  THEMES,
  themes,
} from '@ihsaanly/tailwind/tokens'
import { z } from 'zod'

/** localStorage key the stored theme choice lives under, on every web host. */
export const THEME_KEY = 'ihsaanly.theme'

/** System, Light, Dark, then the named themes: one choice, as on mobile. */
export const THEME_MODES = APPEARANCES
export type ThemeMode = AppearanceName

/** `?theme=` overrides the stored choice for one view (screenshots, QA); never saved. */
export const themeSearch = z.object({ theme: z.enum(THEME_MODES).optional() })

/** The browser chrome's colour: the top of the wash, the brand's or a theme's. */
export const THEME_COLOR = { light: brand['wash-top'].light, dark: brand['wash-top'].dark } as const

/** What the pre-paint script needs of each theme: its scheme and its chrome colour. */
const PAINT = Object.fromEntries(
  THEMES.map((name) => [name, [themes[name].scheme, themes[name].colors['wash-top']]]),
)

// Runs before first paint, so a stored or ?theme= choice never flashes. It is
// allowed by its sha256 hash in each page's Content-Security-Policy. A theme
// sets data-theme to its scheme and data-palette to its name (web.css).
export const THEME_SCRIPT = `(function(){var d=document.documentElement,t=null,p=${JSON.stringify(PAINT)},c={light:'${THEME_COLOR.light}',dark:'${THEME_COLOR.dark}'};try{var q=/[?&]theme=([a-z]+)(&|$)/.exec(location.search);t=q?q[1]:localStorage.getItem('${THEME_KEY}')}catch(e){}var s=t==='light'||t==='dark'?t:p.hasOwnProperty(t)?p[t][0]:null;if(!s)return;d.setAttribute('data-theme',s);if(p.hasOwnProperty(t))d.setAttribute('data-palette',t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute('content',p.hasOwnProperty(t)?p[t][1]:c[s])})()`

/** Cycles System → Light → Dark (the marketing site's toggle); a theme goes back to System. */
export function nextMode(mode: ThemeMode): ThemeMode {
  const index = (BRAND_APPEARANCES as readonly string[]).indexOf(mode)
  return BRAND_APPEARANCES[(index + 1) % BRAND_APPEARANCES.length] ?? 'system'
}

/** Applies a theme choice to the document, mirroring what THEME_SCRIPT does before first paint. */
export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement
  const theme = isTheme(mode) ? mode : null
  const forced: Scheme | null = theme
    ? themes[theme].scheme
    : mode === 'light' || mode === 'dark'
      ? mode
      : null
  if (forced) root.setAttribute('data-theme', forced)
  else root.removeAttribute('data-theme')
  if (theme) root.setAttribute('data-palette', theme)
  else root.removeAttribute('data-palette')
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const media = meta.getAttribute('media') ?? ''
    const scheme = forced ?? (media.includes('dark') ? 'dark' : 'light')
    meta.setAttribute('content', theme ? themes[theme].colors['wash-top'] : THEME_COLOR[scheme])
  }
}
