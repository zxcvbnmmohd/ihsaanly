// What every web host wraps its screens in: @ihsaanly/ui's UiProvider, fed a
// scheme that follows the page's own theme switch (<html data-theme>) and
// falls back to the system's, the named theme (<html data-palette>), and the
// raw systemColors for that scheme from the shared design tokens.
import type { Strings } from '@ihsaanly/core/strings/en'
import { isTheme, system, type ThemeName } from '@ihsaanly/tailwind/tokens'
import { type UiContextValue, UiProvider } from '@ihsaanly/ui/provider'
import { type ReactElement, type ReactNode, useEffect, useState } from 'react'

export type Scheme = 'light' | 'dark'

/** The page's theme: its own switch (`data-theme`) first, else the system's. */
function pageScheme(): Scheme {
  const forced = document.documentElement.dataset.theme
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** The named theme the page wears, if any (`applyMode` and THEME_SCRIPT set it). */
function pageTheme(): ThemeName | undefined {
  const palette = document.documentElement.dataset.palette ?? ''
  return isTheme(palette) ? palette : undefined
}

interface Thing {
  scheme: Scheme
  theme: ThemeName | undefined
}

/**
 * The scheme the page is actually rendering in and its named theme, kept live:
 * a MutationObserver on `<html data-theme>` and `data-palette` (the theme
 * choice) and a matchMedia listener (the OS setting) both re-read them.
 */
export function usePageAppearance(): Thing {
  const [thing, setThing] = useState<Thing>(() => ({
    scheme: pageScheme(),
    theme: pageTheme(),
  }))

  useEffect(() => {
    const rescheme = (): void => setThing({ scheme: pageScheme(), theme: pageTheme() })
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const observer = new MutationObserver(rescheme)
    media.addEventListener('change', rescheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette'],
    })
    return () => {
      media.removeEventListener('change', rescheme)
      observer.disconnect()
    }
  }, [])

  return thing
}

function systemColorsFor(scheme: Scheme): UiContextValue['systemColors'] {
  return {
    label: system['system-label'].web[scheme],
    secondaryLabel: system['system-secondary-label'].web[scheme],
    separator: system['system-separator'].web[scheme],
    systemBackground: system['system-background'].web[scheme],
    secondarySystemBackground: system['system-secondary-background'].web[scheme],
    tint: system['system-tint'].web[scheme],
    onTint: system['system-on-tint'].web[scheme],
  }
}

export interface WebUiProviderProps {
  strings: Strings
  Link: UiContextValue['Link']
  children: ReactNode
}

/**
 * Wraps @ihsaanly/ui's UiProvider with the page's live scheme and theme and
 * this scheme's system colours. The stylesheet follows the theme by itself
 * (web.css's `data-palette` rules), so nothing is written here.
 */
export function WebUiProvider({ strings, Link, children }: WebUiProviderProps): ReactElement {
  const { scheme, theme } = usePageAppearance()
  const value: UiContextValue = {
    strings,
    scheme,
    Link,
    systemColors: systemColorsFor(scheme),
    theme,
  }

  return <UiProvider value={value}>{children}</UiProvider>
}
