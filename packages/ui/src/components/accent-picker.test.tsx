import { describe, expect, it, mock } from 'bun:test'
import { ACCENTS, type AccentName, accents } from '@ihsaanly/tailwind/tokens'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { AccentPicker } from './accent-picker'

const toRgb = (hex: string): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, 1.00)`
}

describe('AccentPicker', () => {
  it('offers every accent by name as one radio group', () => {
    const { strings } = renderScreen(<AccentPicker value="terracotta" onSelect={() => {}} />)
    const group = screen.getByRole('radiogroup', { name: strings.appearance.accentTitle })
    expect(within(group).getAllByRole('radio')).toHaveLength(ACCENTS.length)
    for (const accent of ACCENTS) {
      expect(screen.getByRole('radio', { name: strings.appearance.accents[accent] })).toBeVisible()
    }
  })

  it('marks the chosen accent and rings only it, in its own colour', () => {
    const { strings } = renderScreen(<AccentPicker value="sage" onSelect={() => {}} />, {
      accent: 'sage',
    })
    const sage = screen.getByRole('radio', { name: strings.appearance.accents.sage })
    const rose = screen.getByRole('radio', { name: strings.appearance.accents.rose })
    expect(sage).toHaveAttribute('aria-checked', 'true')
    expect(rose).toHaveAttribute('aria-checked', 'false')
    expect(within(sage).getByTestId('surface-ring').style.borderColor).toBe(
      toRgb(accents.sage.accent.light),
    )
    expect(within(rose).getByTestId('surface-ring').style.borderColor).toBe('rgba(0, 0, 0, 0.00)')
  })

  it('shows each swatch in its own accent for the scheme being rendered', () => {
    const { strings } = renderScreen(<AccentPicker value="terracotta" onSelect={() => {}} />, {
      scheme: 'dark',
    })
    const plum = screen.getByRole('radio', { name: strings.appearance.accents.plum })
    expect(within(plum).getByText(strings.appearance.accentSample).style.color).toBe(
      toRgb(accents.plum.accent.dark),
    )
    expect(within(plum).getByTestId('accent-underline').style.backgroundColor).toBe(
      toRgb(accents.plum.accent.dark),
    )
  })

  it('reports the accent tapped', async () => {
    const onSelect = mock((_accent: AccentName) => {})
    const { user, strings } = renderScreen(<AccentPicker value="terracotta" onSelect={onSelect} />)
    await user.click(screen.getByRole('radio', { name: strings.appearance.accents.graphite }))
    expect(onSelect).toHaveBeenCalledWith('graphite')
  })

  it('lays the ten out two to a row on a phone and five to a row wider', () => {
    const { container } = renderScreen(<AccentPicker value="amber" onSelect={() => {}} />, {
      layout: 'compact',
    })
    const rows = (): Element[] => [
      ...(screen.getByRole('radiogroup').children as unknown as Element[]),
    ]
    expect(rows()).toHaveLength(5)
    container.remove()
    renderScreen(<AccentPicker value="amber" onSelect={() => {}} />, { layout: 'wide' })
    expect(rows()).toHaveLength(2)
  })

  it('names each accent in the reader’s language', () => {
    const { strings } = renderScreen(<AccentPicker value="teal" onSelect={() => {}} />, {
      locale: 'ar',
    })
    expect(screen.getByRole('radio', { name: strings.appearance.accents.teal })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getAllByText(strings.appearance.accentSample)).toHaveLength(ACCENTS.length)
  })
})
