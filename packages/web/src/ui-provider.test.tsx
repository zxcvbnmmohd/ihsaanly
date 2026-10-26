import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { system } from '@ihsaanly/tailwind/tokens'
import { useUi } from '@ihsaanly/ui/provider'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { usePageAppearance, WebUiProvider } from './ui-provider.tsx'

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
  document.documentElement.removeAttribute('data-palette')
})

describe('usePageAppearance', () => {
  test('follows the system when the page does not force a theme', () => {
    expect(renderHook(usePageAppearance).result.current.scheme).toBe('light')
    media.matches = true
    expect(renderHook(usePageAppearance).result.current.scheme).toBe('dark')
  })

  test('the page switch beats the system', () => {
    media.matches = true
    document.documentElement.dataset.theme = 'light'
    expect(renderHook(usePageAppearance).result.current.scheme).toBe('light')
    document.documentElement.dataset.theme = 'dark'
    media.matches = false
    expect(renderHook(usePageAppearance).result.current.scheme).toBe('dark')
  })

  test('an unknown data-theme falls back to the system', () => {
    document.documentElement.dataset.theme = 'sepia'
    media.matches = true
    expect(renderHook(usePageAppearance).result.current.scheme).toBe('dark')
  })

  test('updates when the system setting changes', () => {
    const { result } = renderHook(usePageAppearance)
    expect(result.current.scheme).toBe('light')
    act(() => {
      media.matches = true
      for (const listener of media.listeners) listener()
    })
    expect(result.current.scheme).toBe('dark')
  })

  test('updates when data-theme changes', async () => {
    const { result } = renderHook(usePageAppearance)
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() => expect(result.current.scheme).toBe('dark'))
  })

  test('reads a named theme from data-palette, and ignores an unknown one', async () => {
    const { result } = renderHook(usePageAppearance)
    expect(result.current.theme).toBeUndefined()
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.dataset.palette = 'obsidian'
    await waitFor(() => expect(result.current).toEqual({ scheme: 'dark', theme: 'obsidian' }))
    document.documentElement.dataset.palette = 'sepia'
    await waitFor(() => expect(result.current.theme).toBeUndefined())
  })

  test('stops listening on unmount', () => {
    const { unmount } = renderHook(usePageAppearance)
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

  function ThemeProbe(): ReactElement {
    return <p>{`theme:${useUi().theme ?? 'none'}`}</p>
  }

  test('hands screens the page’s named theme, and none without one', async () => {
    render(
      <WebUiProvider strings={en} Link={Link}>
        <ThemeProbe />
      </WebUiProvider>,
    )
    expect(screen.getByText('theme:none')).toBeInTheDocument()
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.palette = 'sage'
    await waitFor(() => expect(screen.getByText('theme:sage')).toBeInTheDocument())
  })
})
