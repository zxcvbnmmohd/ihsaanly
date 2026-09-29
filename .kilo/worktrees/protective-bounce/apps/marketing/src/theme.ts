import { z } from 'zod'
import { THEME_KEY } from './i18n/locales'

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

/** `?theme=` overrides the stored choice for one view (screenshots, QA); never saved. */
export const themeSearch = z.object({ theme: z.enum(THEME_MODES).optional() })

export const THEME_COLOR = { light: '#f7f0e9', dark: '#1b1411' } as const

// Runs before first paint, so a stored or ?theme= choice never flashes. It is
// allowed by its sha256 hash in each page's Content-Security-Policy.
export const THEME_SCRIPT = `(function(){var d=document.documentElement,t=null;try{var q=/[?&]theme=(light|dark|system)(&|$)/.exec(location.search);t=q?q[1]:localStorage.getItem('${THEME_KEY}')}catch(e){}if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute('content',t==='dark'?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')}})()`
