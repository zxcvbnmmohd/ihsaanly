// Cycles System → Light → Dark. The inline pre-paint script already applies a
// stored or ?theme= choice before first paint; this only wires the button and
// keeps it in sync, so it starts `hidden` until the effect below confirms
// what the page actually applied (mirrors the old site.js setupTheme).

import { storeValue } from '@ihsaanly/web/local-storage'
import { applyMode, nextMode, THEME_KEY, type ThemeMode } from '@ihsaanly/web/theme'
import { useSearch } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { useSite } from '~/i18n/use-site'

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function ThemeIcon({ mode }: { mode: ThemeMode }): ReactNode {
  if (mode === 'light') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        width="20"
        height="20"
        className="size-5 flex-none">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (mode === 'dark') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        width="20"
        height="20"
        className="size-5 flex-none">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" className="size-5 flex-none">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </svg>
  )
}

interface Thing {
  mode: ThemeMode
  ready: boolean
}

export function ThemeToggle(): ReactNode {
  const { a } = useSite()
  const search = useSearch({ strict: false })
  const [thing, setThing] = useState<Thing>(() => ({
    mode: isThemeMode(search.theme) ? search.theme : 'system',
    ready: false,
  }))

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    setThing({ mode: isThemeMode(attr) ? attr : 'system', ready: true })
  }, [])

  function cycle(): void {
    const mode = nextMode(thing.mode)
    applyMode(mode)
    storeValue(THEME_KEY, mode === 'system' ? null : mode)
    setThing({ mode, ready: true })
  }

  const modeName = a(`common.theme.${thing.mode}`)
  const label = a('common.theme.current').replace('{mode}', modeName)

  return (
    <button
      type="button"
      onClick={cycle}
      hidden={!thing.ready}
      aria-label={label}
      title={modeName}
      data-mode={thing.mode}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-rule p-[0.35rem] text-ink-soft hover:border-current hover:text-ink">
      <ThemeIcon mode={thing.mode} />
    </button>
  )
}
