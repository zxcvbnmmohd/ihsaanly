import { afterEach, describe, expect, it } from 'bun:test'
import { THEME_KEY } from '@ihsaanly/web/theme'
import { act, renderHook } from '@testing-library/react'
import { getThemePreference, setThemePreference, useThemePreference } from './store'

afterEach(() => {
  act(() => setThemePreference('system'))
})

describe('theme preference', () => {
  it('starts on the system theme when nothing is stored', () => {
    expect(getThemePreference()).toBe('system')
  })

  it('stores a forced theme under the key the pre-paint script reads, and applies it', () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => setThemePreference('dark'))

    expect(result.current).toBe('dark')
    expect(getThemePreference()).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('forgets the stored value when going back to the system theme', () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => setThemePreference('light'))
    act(() => setThemePreference('system'))

    expect(result.current).toBe('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('stops notifying a hook once it unmounts', () => {
    const { result, unmount } = renderHook(() => useThemePreference())
    unmount()
    act(() => setThemePreference('dark'))
    expect(result.current).toBe('system')
  })
})
