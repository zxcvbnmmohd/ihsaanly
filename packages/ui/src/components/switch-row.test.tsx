import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { SwitchPicture } from './switch-picture'
import { SwitchRow } from './switch-row'

// `?native` loads the native file itself (see row.test.tsx).
const NATIVE = '.tsx?native'

describe('SwitchRow', () => {
  it('flips on when pressed', async () => {
    const onValueChange = mock((_value: boolean) => {})
    const { user } = renderScreen(
      <SwitchRow
        title="Reminders"
        detail="Before prayer"
        value={false}
        onValueChange={onValueChange}
      />,
    )
    expect(screen.getByText('Before prayer')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Reminders' }))
    expect(onValueChange).toHaveBeenCalledWith(true)
  })

  it('exposes exactly one switch, operable from the keyboard', async () => {
    const onValueChange = mock((_value: boolean) => {})
    const { user } = renderScreen(
      <SwitchRow title="Reminders" value={false} onValueChange={onValueChange} />,
    )
    expect(
      screen
        .getAllByRole('switch', { hidden: true })
        .filter((el) => !el.closest('[aria-hidden="true"]')),
    ).toHaveLength(1)
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    await user.tab()
    expect(screen.getByRole('switch')).toHaveFocus()
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  it('flips off when on, with custom colours and no detail', async () => {
    const onValueChange = mock((_value: boolean) => {})
    const { user } = renderScreen(
      <SwitchRow
        title="Reminders"
        value
        accent="#0a0"
        knob="#fff"
        track="#ccc"
        onValueChange={onValueChange}
      />,
    )
    const row = screen.getByRole('switch', { name: 'Reminders' })
    expect(row).toHaveAttribute('aria-checked', 'true')
    await user.click(row)
    expect(onValueChange).toHaveBeenCalledWith(false)
  })

  it('has no focusable or form control inside the row on the web', () => {
    const { container } = renderScreen(
      <SwitchRow title="Reminders" value onValueChange={() => {}} />,
    )
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(1)
    expect(screen.getByTestId('switch-picture')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ignores Space repeats and other keys, and keeps Space from scrolling', () => {
    const onValueChange = mock((_value: boolean) => {})
    renderScreen(<SwitchRow title="Reminders" value={false} onValueChange={onValueChange} />)
    const row = screen.getByRole('switch')
    expect(fireEvent.keyDown(row, { key: ' ', repeat: true })).toBe(false)
    expect(fireEvent.keyDown(row, { key: 'a' })).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('SwitchPicture', () => {
  it('draws the track in the on and off colours on the web', () => {
    const props = { onValueChange: () => {}, trackOn: '#0a0', trackOff: '#ccc', knob: '#fff' }
    const style = (): string => screen.getByTestId('switch-picture').getAttribute('style') ?? ''
    const { rerender } = renderScreen(<SwitchPicture {...props} value />)
    expect(style()).toContain('rgba(0, 170, 0, 1.00)')
    expect(style()).toContain('align-items: flex-end')
    rerender(<SwitchPicture {...props} value={false} />)
    expect(style()).toContain('rgba(204, 204, 204, 1.00)')
    expect(style()).toContain('align-items: flex-start')
    expect(screen.getByTestId('switch-picture')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is the platform Switch on native, hidden from assistive tech, and still toggles', async () => {
    const { SwitchPicture: Native } = (await import(
      `./switch-picture${NATIVE}`
    )) as typeof import('./switch-picture')
    const onValueChange = mock((_value: boolean) => {})
    renderScreen(
      <Native
        value={false}
        onValueChange={onValueChange}
        trackOn="#0a0"
        trackOff="#ccc"
        knob="#fff"
      />,
    )
    const input = screen.getByRole('switch', { hidden: true })
    fireEvent.click(input)
    expect(onValueChange).toHaveBeenCalledWith(true)
  })
})
