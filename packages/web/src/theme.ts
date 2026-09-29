import { z } from 'zod'

/** localStorage key the stored theme choice lives under, on every web host. */
export const THEME_KEY = 'ihsaanly.theme'

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

/** `?theme=` overrides the stored choice for one view (screenshots, QA); never saved. */
export const themeSearch = z.object({ theme: z.enum(THEME_MODES).optional() })

export const THEME_COLOR = { light: '#f7f0e9', dark: '#1b1411' } as const

// Runs before first paint, so a stored or ?theme= choice never flashes. It is
// allowed by its sha256 hash in each page's Content-Security-Policy.
export const THEME_SCRIPT = `(function(){var d=document.documentElement,t=null;try{var q=/[?&]theme=(light|dark|system)(&|$)/.exec(location.search);t=q?q[1]:localStorage.getItem('${THEME_KEY}')}catch(e){}if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute('content',t==='dark'?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')}})()`

/** Cycles System → Light → Dark. */
export function nextMode(mode: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(mode)
  return THEME_MODES[(index + 1) % THEME_MODES.length] ?? 'system'
}

/** Applies a theme choice to the document, mirroring what THEME_SCRIPT does before first paint. */
export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const media = meta.getAttribute('media') ?? ''
    const scheme = mode === 'system' ? (media.includes('dark') ? 'dark' : 'light') : mode
    meta.setAttribute('content', THEME_COLOR[scheme])
  }
}
