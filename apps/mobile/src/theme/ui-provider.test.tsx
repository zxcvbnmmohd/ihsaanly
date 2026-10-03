import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { useUi } from '@ihsaanly/ui/provider'
import { act, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { router } from '../../test/router'
import {
  appearance,
  installAppearance,
  installColors,
  restoreAppearance,
  restoreOS,
  restoreRouter,
  setOS,
} from '../../test/theme'

installColors()
const { MobileUiProvider } = await import('./ui-provider')
const { setThemePreference } = await import('./store')

let seen: ReturnType<typeof useUi> | null = null

function Probe(): ReactElement {
  const ui = useUi()
  seen = ui
  const { Link } = ui
  return (
    <>
      <span data-testid="scheme">{ui.scheme}</span>
      <Link href="/about">About</Link>
    </>
  )
}

beforeEach(() => {
  installColors()
  installAppearance()
  setOS('ios')
  setThemePreference('light')
  seen = null
})
afterEach(() => restoreOS())
afterAll(() => {
  restoreAppearance()
  restoreRouter()
})

describe('MobileUiProvider', () => {
  it('feeds the UI package the strings, scheme, OS colours and router Link', () => {
    render(
      <MobileUiProvider>
        <Probe />
      </MobileUiProvider>,
    )
    expect(screen.getByTestId('scheme').textContent).toBe('light')
    expect(seen?.strings.onboarding).toBeDefined()
    expect(seen?.systemColors).toEqual({
      label: 'ios:label',
      secondaryLabel: 'ios:secondaryLabel',
      separator: 'ios:separator',
      systemBackground: 'ios:systemBackground',
      secondarySystemBackground: 'ios:secondarySystemBackground',
      tint: 'ios:systemBlue',
      onTint: 'ios:systemBackground',
    })
    expect(screen.getByText('About').closest('a')?.getAttribute('data-href')).toBe('/about')
    expect(router.calls).toEqual([])
  })

  it('tells the stylesheet the scheme the app actually renders in, after every render', () => {
    // Under System the OS answers; Appearance's cache can still hold the old
    // scheme, so the stylesheet is told the resolved one rather than "auto".
    appearance.scheme = 'dark'
    act(() => setThemePreference('system'))
    render(
      <MobileUiProvider>
        <Probe />
      </MobileUiProvider>,
    )
    expect(screen.getByTestId('scheme').textContent).toBe('dark')
    expect(appearance.set.at(-1)).toBe('dark')

    act(() => setThemePreference('light'))
    expect(screen.getByTestId('scheme').textContent).toBe('light')
    expect(appearance.set.at(-1)).toBe('light')
  })
})
