import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import {
  appearance,
  installAppearance,
  restoreAppearance,
  restoreOS,
  setOS,
} from '../../test/theme'

const native = {
  nightModes: [] as string[],
  systemMode: 'light' as 'light' | 'dark',
}
const fakeModule = {
  setNightMode: (mode: string) => void native.nightModes.push(mode),
  getSystemNightMode: () => native.systemMode,
}

// Importing the real module needs `expo`'s requireOptionalNativeModule, which
// the real package does not export under Bun.
const realExpo = { ...(await import(`${Bun.resolveSync('expo', import.meta.dir)}?real`)) }
mock.module('expo', () => ({ ...realExpo, requireOptionalNativeModule: () => null }))
const themeOverride = '../../modules/theme-override'
const original = (await import(themeOverride)).ThemeOverride
const useNative = (value: typeof fakeModule | null): void => {
  mock.module(themeOverride, () => ({ ThemeOverride: value }))
}

useNative(fakeModule)
const store = await import('./store')
const { palettes } = await import('./colors')

beforeEach(() => {
  installAppearance()
  native.nightModes = []
  native.systemMode = 'light'
  useNative(fakeModule)
  setOS('android')
  store.setThemePreference('system')
  appearance.set = []
  native.nightModes = []
})

afterEach(() => restoreOS())
afterAll(() => {
  restoreAppearance()
  useNative(original)
})

describe('applyThemePreference', () => {
  it('persists the mode natively on Android and applies it through Appearance', () => {
    store.applyThemePreference('dark')
    expect(native.nightModes).toEqual(['dark'])
    expect(appearance.set).toEqual(['dark'])
  })

  it('hands System back to the OS as "auto"', () => {
    store.applyThemePreference('system')
    expect(native.nightModes).toEqual(['system'])
    expect(appearance.set).toEqual(['auto'])
  })

  it('only applies through Appearance on iOS, where the module is absent', () => {
    setOS('ios')
    store.applyThemePreference('light')
    expect(native.nightModes).toEqual([])
    expect(appearance.set).toEqual(['light'])
  })

  it('copes with the native module being missing, as in Expo Go', () => {
    useNative(null)
    store.applyThemePreference('dark')
    expect(appearance.set).toEqual(['dark'])
  })
})

describe('setThemePreference', () => {
  it('stores the choice and applies it', () => {
    store.setThemePreference('dark')
    expect(store.getThemePreference()).toBe('dark')
    expect(appearance.set).toEqual(['dark'])
    expect(native.nightModes).toEqual(['dark'])
  })
})

describe('useEffectiveColorScheme', () => {
  it('is an explicit preference regardless of the device', () => {
    appearance.scheme = 'dark'
    store.setThemePreference('light')
    const view = renderHook(() => store.useEffectiveColorScheme())
    expect(view.result.current).toBe('light')
  })

  it('follows the device under System, read from the native module on Android', () => {
    appearance.scheme = 'light'
    native.systemMode = 'dark'
    const view = renderHook(() => store.useEffectiveColorScheme())
    expect(view.result.current).toBe('dark')
  })

  it('follows Appearance under System elsewhere, and updates on a change', () => {
    setOS('ios')
    appearance.scheme = 'dark'
    const view = renderHook(() => store.useEffectiveColorScheme())
    expect(view.result.current).toBe('dark')

    appearance.scheme = 'light'
    act(() => {
      for (const listener of appearance.listeners) listener({ colorScheme: 'light' })
    })
    expect(view.result.current).toBe('light')
  })

  it('treats a null Appearance scheme as light, and an unavailable module as Appearance', () => {
    useNative(null)
    appearance.scheme = null
    const view = renderHook(() => store.useEffectiveColorScheme())
    expect(view.result.current).toBe('light')
  })

  it('stops listening to Appearance on unmount', () => {
    const view = renderHook(() => store.useEffectiveColorScheme())
    view.unmount()
    expect(appearance.removed).toBe(1)
    expect(appearance.listeners.size).toBe(0)
  })

  it('re-renders when the stored preference changes', () => {
    const view = renderHook(() => store.useEffectiveColorScheme())
    expect(view.result.current).toBe('light')
    act(() => store.setThemePreference('dark'))
    expect(view.result.current).toBe('dark')
  })
})

describe('usePalette', () => {
  it('is the brand palette of the scheme being rendered', () => {
    store.setThemePreference('dark')
    expect(renderHook(() => store.usePalette()).result.current).toBe(palettes.dark)
    act(() => store.setThemePreference('light'))
    expect(renderHook(() => store.usePalette()).result.current).toBe(palettes.light)
  })
})
