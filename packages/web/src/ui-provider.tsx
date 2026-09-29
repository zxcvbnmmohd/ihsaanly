// What every web host wraps its screens in: @ihsaanly/ui's UiProvider, fed a
// scheme that follows the page's own theme switch (<html data-theme>) and
// falls back to the system's, and the raw systemColors for that scheme from
// the shared design tokens.
import type { Strings } from '@ihsaanly/core/strings/en'
import { system } from '@ihsaanly/tailwind/tokens'
import { type UiContextValue, UiProvider } from '@ihsaanly/ui/provider'
import { type ReactElement, type ReactNode, useEffect, useState } from 'react'

export type Scheme = 'light' | 'dark'

/** The page's theme: its own switch (`data-theme`) first, else the system's. */
function pageScheme(): Scheme {
  const forced = document.documentElement.dataset.theme
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface Thing {
  scheme: Scheme
}

/**
 * The scheme the page is actually rendering in, kept live: a MutationObserver
 * on `<html data-theme>` (the theme toggle) and a matchMedia listener (the OS
 * setting) both re-read it.
 */
export function usePageScheme(): Scheme {
  const [thing, setThing] = useState<Thing>(() => ({ scheme: pageScheme() }))

  useEffect(() => {
    const rescheme = (): void => setThing({ scheme: pageScheme() })
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const observer = new MutationObserver(rescheme)
    media.addEventListener('change', rescheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => {
      media.removeEventListener('change', rescheme)
      observer.disconnect()
    }
  }, [])

  return thing.scheme
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

/** Wraps @ihsaanly/ui's UiProvider with a live scheme and this scheme's system colours. */
export function WebUiProvider({ strings, Link, children }: WebUiProviderProps): ReactElement {
  const scheme = usePageScheme()
  const value: UiContextValue = {
    strings,
    scheme,
    Link,
    systemColors: systemColorsFor(scheme),
  }
  return <UiProvider value={value}>{children}</UiProvider>
}
