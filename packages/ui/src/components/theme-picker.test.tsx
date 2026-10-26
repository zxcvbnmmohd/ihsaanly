import { describe, expect, it, mock } from 'bun:test'
import { BRAND_APPEARANCES, palettes, THEMES, themes } from '@ihsaanly/tailwind/tokens'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import type { ThemePreference } from '../types'
import { previewPalettes, ThemePicker } from './theme-picker'

const toRgb = (hex: string): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, 1.00)`
}

describe('ThemePicker', () => {
  it('offers System, Light and Dark, then every theme, each group a radio group', () => {
    const { strings } = renderScreen(<ThemePicker value="system" onSelect={() => {}} />)
    const modes = screen.getByRole('radiogroup', { name: strings.appearance.modesTitle })
    const named = screen.getByRole('radiogroup', { name: strings.appearance.themesTitle })
    expect(within(modes).getAllByRole('radio')).toHaveLength(BRAND_APPEARANCES.length)
    expect(within(named).getAllByRole('radio')).toHaveLength(THEMES.length)
    for (const theme of THEMES) {
      expect(
        within(named).getByRole('radio', { name: strings.appearance.themes[theme] }),
      ).toBeVisible()
    }
    expect(screen.getByRole('heading', { name: strings.appearance.modesTitle })).toBeVisible()
  })

  it('marks and rings only the chosen option, in the theme’s own accent', () => {
    const { strings } = renderScreen(<ThemePicker value="parchment" onSelect={() => {}} />, {
      theme: 'parchment',
    })
    const parchment = screen.getByRole('radio', { name: strings.appearance.themes.parchment })
    const sky = screen.getByRole('radio', { name: strings.appearance.themes.sky })
    expect(parchment).toHaveAttribute('aria-checked', 'true')
    expect(sky).toHaveAttribute('aria-checked', 'false')
    expect(within(parchment).getByTestId('surface-ring').style.borderColor).toBe(
      toRgb(themes.parchment.colors.accent),
    )
    expect(within(sky).getByTestId('surface-ring').style.borderColor).toBe('rgba(0, 0, 0, 0.00)')
    expect(within(parchment).getByText(strings.appearance.themes.parchment).style.color).toBe(
      toRgb(themes.parchment.colors['accent-ink']),
    )
  })

  it('previews each theme’s wash, a card in its paper and "Aa" in its accent', () => {
    const { strings } = renderScreen(<ThemePicker value="system" onSelect={() => {}} />)
    const midnight = screen.getByRole('radio', { name: strings.appearance.themes.midnight })
    const { colors } = themes.midnight
    expect(within(midnight).getByText(strings.appearance.themeSample).style.color).toBe(
      toRgb(colors.accent),
    )
    expect(within(midnight).getByTestId('theme-underline').style.backgroundColor).toBe(
      toRgb(colors.accent),
    )
    expect(within(midnight).getByTestId('theme-card').style.backgroundColor).toBe(
      toRgb(colors.paper),
    )
    // System shows both halves, Light and Dark one each.
    const system = screen.getByRole('radio', { name: strings.appearance.system })
    expect(within(system).getAllByTestId('theme-canvas')).toHaveLength(2)
    const dark = screen.getByRole('radio', { name: strings.appearance.dark })
    expect(within(dark).getAllByTestId('theme-canvas')).toHaveLength(1)
  })

  it('reports the option tapped', async () => {
    const onSelect = mock((_preference: ThemePreference) => {})
    const { user, strings } = renderScreen(<ThemePicker value="system" onSelect={onSelect} />)
    await user.click(screen.getByRole('radio', { name: strings.appearance.themes.rose }))
    await user.click(screen.getByRole('radio', { name: strings.appearance.dark }))
    expect(onSelect.mock.calls).toEqual([['rose'], ['dark']])
  })

  it('lays the ten themes out two to a row on a phone and five to a row wider', () => {
    const rows = (): number => screen.getAllByRole('radiogroup')[1]?.children.length ?? 0
    const { container } = renderScreen(<ThemePicker value="ivory" onSelect={() => {}} />, {
      layout: 'compact',
    })
    expect(rows()).toBe(5)
    container.remove()
    renderScreen(<ThemePicker value="ivory" onSelect={() => {}} />, { layout: 'wide' })
    expect(rows()).toBe(2)
  })

  it('names each option in the reader’s language', () => {
    const { strings } = renderScreen(<ThemePicker value="dusk" onSelect={() => {}} />, {
      locale: 'ar',
    })
    expect(screen.getByRole('radio', { name: strings.appearance.themes.dusk })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getAllByText(strings.appearance.themeSample)).toHaveLength(THEMES.length + 4)
  })
})

describe('previewPalettes', () => {
  it('previews System as both brand palettes, Light and Dark as one, a theme as its own', () => {
    expect(previewPalettes('system')).toEqual([palettes.light, palettes.dark])
    expect(previewPalettes('dark')).toEqual([palettes.dark])
    expect(previewPalettes('forest')[0]?.accent).toBe(themes.forest.colors.accent)
  })
})
