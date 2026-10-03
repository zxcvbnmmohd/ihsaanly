import { afterEach, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { getThemePreference, setThemePreference, useThemePreference } from './store'

afterEach(() => {
  setThemePreference('system')
})

it('starts as the system theme when nothing was stored', () => {
  expect(getThemePreference()).toBe('system')
})

it('saves a choice under the key the pre-paint script reads and applies it to the page', () => {
  setThemePreference('dark')
  expect(getThemePreference()).toBe('dark')
  expect(localStorage.getItem('ihsaanly.theme')).toBe('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')

  setThemePreference('system')
  expect(localStorage.getItem('ihsaanly.theme')).toBeNull()
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

it('re-renders subscribers on a change and forgets them on unmount', () => {
  const { result, unmount } = renderHook(() => useThemePreference())
  expect(result.current).toBe('system')

  act(() => setThemePreference('light'))
  expect(result.current).toBe('light')

  unmount()
  setThemePreference('dark')
  expect(result.current).toBe('light')
})
