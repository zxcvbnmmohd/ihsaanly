import { describe, expect, it } from 'bun:test'
import { accents, palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { renderScreen } from '../test/render'
import { useColors, usePalette } from './colors'

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
        palette: palette.accent,
      })}
    </output>
  )
}

const read = (): Record<string, string> => JSON.parse(screen.getByRole('status').textContent ?? '')

describe('colour resolution', () => {
  it('paints with terracotta when the host names no accent', () => {
    renderScreen(<Probe />)
    expect(read()).toMatchObject({
      accent: palettes.light.accent,
      accentInk: palettes.light.accentInk,
      tint: palettes.light.tint,
      palette: palettes.light.accent,
    })
  })

  it('resolves every accent-derived colour from the chosen accent and scheme', () => {
    renderScreen(<Probe />, { scheme: 'dark', accent: 'teal' })
    expect(read()).toEqual({
      accent: accents.teal.accent.dark,
      accentInk: accents.teal['accent-ink'].dark,
      onAccent: accents.teal['on-accent'].dark,
      indicator: accents.teal.indicator.dark,
      tint: accents.teal.tint.dark,
      // The wash is the brand's under every accent.
      washTop: palettes.dark.wash[0],
      palette: accents.teal.accent.dark,
    })
  })
})
