import { describe, expect, it } from 'bun:test'
import { paletteFor, themes } from '@ihsaanly/tailwind/tokens'
import { DarkTheme, DefaultTheme } from 'expo-router/react-navigation'

import { navigationTheme } from './navigation'

describe('navigationTheme', () => {
  it('is React Navigation’s own under System, Light and Dark', () => {
    expect(navigationTheme('light', paletteFor('light'), false)).toBe(DefaultTheme)
    expect(navigationTheme('dark', paletteFor('dark'), false)).toBe(DarkTheme)
  })

  it('takes a named theme’s wash, ink and accent over its scheme’s base', () => {
    const theme = navigationTheme('dark', paletteFor('dark', 'forest'), true)
    const { colors } = themes.forest
    expect(theme.dark).toBe(true)
    expect(theme.colors).toMatchObject({
      primary: colors.accent,
      background: colors['wash-top'],
      card: colors['wash-top'],
      text: colors.ink,
      border: colors.rule,
      notification: colors.accent,
    })
    expect(theme.fonts).toBe(DarkTheme.fonts)
  })
})
