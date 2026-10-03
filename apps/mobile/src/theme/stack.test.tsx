import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import {
  installAppearance,
  installColors,
  restoreAppearance,
  restoreOS,
  restoreRouter,
  setOS,
} from '../../test/theme'

installColors()
const { useStackScreenOptions } = await import('./stack')
const { setThemePreference } = await import('./store')
const { palettes } = await import('./colors')

beforeEach(() => {
  installColors()
  installAppearance()
  setThemePreference('light')
})
afterEach(() => restoreOS())
afterAll(() => {
  restoreAppearance()
  restoreRouter()
})

describe('useStackScreenOptions', () => {
  it('keeps the large collapsing title on iOS with an ordinary header', () => {
    setOS('ios')
    const { result } = renderHook(() => useStackScreenOptions())
    expect(result.current).toEqual({
      headerShadowVisible: false,
      headerLargeTitleEnabled: true,
      headerLargeTitleShadowVisible: false,
      headerTitleStyle: { color: 'ios:label' },
      headerBackButtonDisplayMode: 'minimal',
    })
  })

  it('paints the Android bar the top of the wash, in the rendered scheme', () => {
    setOS('android')
    const light = renderHook(() => useStackScreenOptions()).result.current
    expect(light).toMatchObject({
      headerShadowVisible: false,
      headerStyle: { backgroundColor: palettes.light.wash[0] },
      headerTitleStyle: { color: 'android:onSurface' },
      headerTintColor: 'android:onSurface',
      headerBackButtonDisplayMode: 'minimal',
    })
    expect(light).not.toHaveProperty('headerLargeTitleEnabled')

    setThemePreference('dark')
    const dark = renderHook(() => useStackScreenOptions()).result.current
    expect(dark).toMatchObject({ headerStyle: { backgroundColor: palettes.dark.wash[0] } })
  })
})
