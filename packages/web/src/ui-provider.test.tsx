import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { accents, system } from '@ihsaanly/tailwind/tokens'
import { useUi } from '@ihsaanly/ui/provider'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { applyAccent, usePageScheme, WebUiProvider } from './ui-provider.tsx'

interface FakeMedia {
  matches: boolean
  listeners: Set<() => void>
}
const originalMatchMedia = window.matchMedia
let media: FakeMedia

beforeEach(() => {
  media = { matches: false, listeners: new Set() }
  window.matchMedia = ((): MediaQueryList =>
    ({
      get matches() {
        return media.matches
      },
      addEventListener: (_type: string, listener: () => void) => media.listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        media.listeners.delete(listener),
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})
afterEach(() => {
  cleanup()
  window.matchMedia = originalMatchMedia
  document.documentElement.removeAttribute('data-theme')
})

describe('usePageScheme', () => {
  test('follows the system when the page does not force a theme', () => {
    expect(renderHook(usePageScheme).result.current).toBe('light')
    media.matches = true
    expect(renderHook(usePageScheme).result.current).toBe('dark')
  })

  test('the page switch beats the system', () => {
    media.matches = true
    document.documentElement.dataset.theme = 'light'
    expect(renderHook(usePageScheme).result.current).toBe('light')
    document.documentElement.dataset.theme = 'dark'
    media.matches = false
    expect(renderHook(usePageScheme).result.current).toBe('dark')
  })

  test('an unknown data-theme falls back to the system', () => {
    document.documentElement.dataset.theme = 'sepia'
    media.matches = true
    expect(renderHook(usePageScheme).result.current).toBe('dark')
  })

  test('updates when the system setting changes', () => {
    const { result } = renderHook(usePageScheme)
    expect(result.current).toBe('light')
    act(() => {
      media.matches = true
      for (const listener of media.listeners) listener()
    })
    expect(result.current).toBe('dark')
  })

  test('updates when data-theme changes', async () => {
    const { result } = renderHook(usePageScheme)
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() => expect(result.current).toBe('dark'))
  })

  test('stops listening on unmount', () => {
    const { unmount } = renderHook(usePageScheme)
    expect(media.listeners.size).toBe(1)
    unmount()
    expect(media.listeners.size).toBe(0)
  })
})

describe('WebUiProvider', () => {
  function Probe(): ReactElement {
    const ui = useUi()
    return <p>{`${ui.scheme}|${String(ui.systemColors.tint)}|${ui.strings.onboarding.continue}`}</p>
  }
  const Link = (({ children }: { children: ReactNode }) => children) as never

  test("gives children the strings, the live scheme and that scheme's system colours", async () => {
    render(
      <WebUiProvider strings={en} Link={Link}>
        <Probe />
      </WebUiProvider>,
    )
    expect(
      screen.getByText(`light|${system['system-tint'].web.light}|${en.onboarding.continue}`),
    ).toBeInTheDocument()
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() =>
      expect(
        screen.getByText(`dark|${system['system-tint'].web.dark}|${en.onboarding.continue}`),
      ).toBeInTheDocument(),
    )
  })

  const variable = (name: string): string =>
    document.documentElement.style.getPropertyValue(`--color-${name}`)

  function AccentProbe(): ReactElement {
    return <p>{`accent:${useUi().accent ?? 'none'}`}</p>
  }

  test('hands screens the accent and lays its colours over the stylesheet for the scheme', async () => {
    const view = render(
      <WebUiProvider strings={en} Link={Link} accent="indigo">
        <AccentProbe />
      </WebUiProvider>,
    )
    expect(screen.getByText('accent:indigo')).toBeInTheDocument()
    expect(variable('accent')).toBe(accents.indigo.accent.light)
    expect(variable('accent-ink')).toBe(accents.indigo['accent-ink'].light)
    expect(variable('on-accent')).toBe(accents.indigo['on-accent'].light)
    expect(variable('indicator')).toBe(accents.indigo.indicator.light)
    expect(variable('tint')).toBe(accents.indigo.tint.light)

    document.documentElement.dataset.theme = 'dark'
    await waitFor(() => expect(variable('accent')).toBe(accents.indigo.accent.dark))

    // Back to the default: the stylesheet's own values show through again.
    view.rerender(
      <WebUiProvider strings={en} Link={Link} accent="terracotta">
        <AccentProbe />
      </WebUiProvider>,
    )
    expect(variable('accent')).toBe('')
    expect(variable('tint')).toBe('')
  })

  test('leaves the page alone when the host names no accent', () => {
    render(
      <WebUiProvider strings={en} Link={Link}>
        <AccentProbe />
      </WebUiProvider>,
    )
    expect(screen.getByText('accent:none')).toBeInTheDocument()
    expect(variable('accent')).toBe('')
  })
})

describe('applyAccent', () => {
  test('writes every accent colour for one scheme, and clears them for the default', () => {
    applyAccent('graphite', 'dark')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(
      accents.graphite.accent.dark,
    )
    applyAccent('terracotta', 'dark')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('')
  })
})
