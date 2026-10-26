import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { themes } from '@ihsaanly/tailwind/tokens'
import {
  applyMode,
  nextMode,
  THEME_COLOR,
  THEME_KEY,
  THEME_MODES,
  THEME_SCRIPT,
  themeSearch,
} from './theme.ts'

describe('nextMode', () => {
  test('cycles System, Light, Dark and back', () => {
    expect(nextMode('system')).toBe('light')
    expect(nextMode('light')).toBe('dark')
    expect(nextMode('dark')).toBe('system')
  })

  test('takes a named theme back to System', () => {
    expect(nextMode('obsidian')).toBe('system')
  })
})

describe('themeSearch', () => {
  test('accepts a known mode or none, and rejects others', () => {
    for (const theme of THEME_MODES) expect(themeSearch.parse({ theme })).toEqual({ theme })
    expect(themeSearch.parse({})).toEqual({})
    expect(themeSearch.parse({ theme: 'midnight' })).toEqual({ theme: 'midnight' })
    expect(themeSearch.safeParse({ theme: 'sepia' }).success).toBe(false)
  })
})

describe('applyMode', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="theme-color" media="(prefers-color-scheme: light)" content="x">' +
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="x">' +
      '<meta name="theme-color" content="x">'
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-palette')
    document.head.innerHTML = ''
  })
  const colors = (): (string | null)[] =>
    [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content'))

  test('forcing a mode sets data-theme and every theme-color to it', () => {
    applyMode('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(colors()).toEqual([THEME_COLOR.dark, THEME_COLOR.dark, THEME_COLOR.dark])
    applyMode('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(colors()).toEqual([THEME_COLOR.light, THEME_COLOR.light, THEME_COLOR.light])
  })

  test('a named theme sets its scheme, its palette and its own wash as the chrome', () => {
    applyMode('espresso')
    const root = document.documentElement
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(root.getAttribute('data-palette')).toBe('espresso')
    const wash = themes.espresso.colors['wash-top']
    expect(colors()).toEqual([wash, wash, wash])
    applyMode('light')
    expect(root.hasAttribute('data-palette')).toBe(false)
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  test('system clears data-theme and restores each meta by its media query', () => {
    applyMode('dark')
    applyMode('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(colors()).toEqual([THEME_COLOR.light, THEME_COLOR.dark, THEME_COLOR.light])
  })
})

describe('THEME_SCRIPT', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-palette')
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    document.head.innerHTML = ''
  })
  const run = (): void => {
    new Function(THEME_SCRIPT)()
  }

  test('applies a stored dark or light choice and the matching theme-color', () => {
    document.head.innerHTML = '<meta name="theme-color" content="x">'
    window.localStorage.setItem(THEME_KEY, 'dark')
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.querySelector('meta')?.getAttribute('content')).toBe(THEME_COLOR.dark)
    window.localStorage.setItem(THEME_KEY, 'light')
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.querySelector('meta')?.getAttribute('content')).toBe(THEME_COLOR.light)
  })

  test('applies a stored theme: its scheme, its palette and its chrome colour', () => {
    document.head.innerHTML = '<meta name="theme-color" content="x">'
    window.localStorage.setItem(THEME_KEY, 'sky')
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-palette')).toBe('sky')
    expect(document.querySelector('meta')?.getAttribute('content')).toBe(
      themes.sky.colors['wash-top'],
    )
  })

  test('ignores a stored name it does not know', () => {
    window.localStorage.setItem(THEME_KEY, 'sepia')
    run()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  test('?theme= beats the stored choice', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    window.history.replaceState(null, '', '/?theme=light')
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('system or nothing leaves the page alone', () => {
    window.localStorage.setItem(THEME_KEY, 'system')
    run()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
