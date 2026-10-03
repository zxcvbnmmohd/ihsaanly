import { describe, expect, it, mock } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { type RenderScreenResult, renderScreen } from '../../test/render'
import { Counter } from './counter'

const palette = palettes.light

function setup(count: number): RenderScreenResult & {
  onTap: ReturnType<typeof mock>
  onReset: ReturnType<typeof mock>
} {
  const onTap = mock(() => {})
  const onReset = mock(() => {})
  const view = renderScreen(
    <Counter
      label="SubhanAllah"
      count={count}
      target={33}
      onTap={onTap}
      onReset={onReset}
      resetLabel="Reset"
      palette={palette}
    />,
  )
  return { ...view, onTap, onReset }
}

describe('Counter', () => {
  it('counts taps towards the target', async () => {
    const { user, onTap } = setup(5)
    const target = screen.getByRole('button', { name: 'SubhanAllah' })
    expect(screen.getByText('/ 33')).toBeInTheDocument()
    await user.click(target)
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('describes its progress to assistive technology', () => {
    setup(5)
    expect(screen.getByRole('button', { name: 'SubhanAllah' })).toHaveAccessibleDescription(
      /5\s*\/\s*33/,
    )
  })

  it('resets once there is a count', async () => {
    const { user, onReset } = setup(5)
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('shows completion and stops accepting taps', async () => {
    const { user, onTap } = setup(33)
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('33')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'SubhanAllah' }))
    expect(onTap).not.toHaveBeenCalled()
  })

  it('hides the reset control at zero', () => {
    setup(0)
    const reset = screen.getByRole('button', { name: 'Reset', hidden: true })
    expect(reset.parentElement).toHaveStyle({ opacity: '0' })
  })
})
