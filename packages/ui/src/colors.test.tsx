import { describe, expect, it } from 'bun:test'
import { palettes, system, themes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { renderScreen } from '../test/render'
import { useColors, usePalette, useSystemColors } from './colors'

function Probe(): ReactElement {
  const colors = useColors()
  const palette = usePalette()
  return (
    <output>
      {JSON.stringify({
        accent: colors.accent,
        accentInk: colors.accentInk,
        onAccent: colors.onAccent,
        indicator: colors.indicator,
        tint: colors.tint,
        washTop: colors.washTop,
        paper: colors.paper,
        ink: colors.ink,
        fieldBorder: colors.fieldBorder,
        label: colors.label,
        separator: colors.separator,
        secondaryBackground: colors.secondarySystemBackground,
        systemTint: colors.systemTint,
        palette: palette.accent,
        system: useSystemColors().label,
      })}
    </output>
  )
}

const read = (): Record<string, string> => JSON.parse(screen.getByRole('status').textContent ?? '')

describe('colour resolution', () => {
  it('paints with the brand palette and the system colours when no theme is named', () => {
    renderScreen(<Probe />)
    expect(read()).toMatchObject({
      accent: palettes.light.accent,
      accentInk: palettes.light.accentInk,
      tint: palettes.light.tint,
      paper: palettes.light.paper,
      palette: palettes.light.accent,
      label: system['system-label'].web.light,
      system: system['system-label'].web.light,
    })
  })

  it('resolves the whole canvas, system colours included, from a named theme', () => {
    renderScreen(<Probe />, { scheme: 'light', theme: 'midnight' })
    const { colors } = themes.midnight
    expect(read()).toEqual({
      accent: colors.accent,
      accentInk: colors['accent-ink'],
      onAccent: colors['on-accent'],
      indicator: colors.indicator,
      tint: colors.tint,
      washTop: colors['wash-top'],
      paper: colors.paper,
      ink: colors.ink,
      fieldBorder: colors['field-border'],
      // The theme's own ink, rule and paper stand in for the OS's.
      label: colors.ink,
      separator: colors.rule,
      secondaryBackground: colors.paper,
      systemTint: colors.accent,
      palette: colors.accent,
      system: colors.ink,
    })
  })
})
