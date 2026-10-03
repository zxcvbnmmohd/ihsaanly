import { describe, expect, it, mock } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Stepper } from './stepper'

const palette = palettes.light

describe('Stepper', () => {
  it('nudges up and down', async () => {
    const onChange = mock((_value: number) => {})
    const { user } = renderScreen(
      <Stepper label="Rakats" value={2} onChange={onChange} palette={palette} />,
    )
    await user.click(screen.getByRole('button', { name: 'Rakats +' }))
    await user.click(screen.getByRole('button', { name: 'Rakats −' }))
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([3, 1])
  })

  it('cannot go below the minimum', async () => {
    const onChange = mock((_value: number) => {})
    const { user } = renderScreen(
      <Stepper label="Rakats" value={0} onChange={onChange} palette={palette} />,
    )
    const minus = screen.getByRole('button', { name: 'Rakats −' })
    expect(minus).toHaveAttribute('aria-disabled', 'true')
    await user.click(minus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('honours a custom minimum', () => {
    renderScreen(<Stepper label="Days" value={1} min={1} onChange={() => {}} palette={palette} />)
    expect(screen.getByRole('button', { name: 'Days −' })).toHaveAttribute('aria-disabled', 'true')
  })
})
