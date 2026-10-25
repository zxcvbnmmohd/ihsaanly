import { describe, expect, it, mock } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { ChoiceRow } from './choice-row'

describe('ChoiceRow', () => {
  it('is a radio carrying its state, title and detail', async () => {
    const onPress = mock(() => {})
    const { user } = renderScreen(
      <ChoiceRow title="Hanafi" detail="Later Asr" selected accent="#ff0000" onPress={onPress} />,
    )
    const radio = screen.getByRole('radio', { name: /Hanafi/ })
    expect(radio).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Later Asr')).toBeInTheDocument()
    await user.click(radio)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('omits the detail and shows unselected', () => {
    renderScreen(<ChoiceRow title="Shafi" detail={null} selected={false} onPress={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Shafi' })).toHaveAttribute('aria-checked', 'false')
  })
  // The ring is a sibling of the surface, not its border: liquid glass covers its own border.
  it('rings the selected row from outside the surface', () => {
    renderScreen(<ChoiceRow title="Hanafi" selected accent="#ff0000" onPress={() => {}} />)
    const ring = within(screen.getByRole('radio')).getByTestId('surface-ring')
    expect(ring.style.borderColor).toBe('rgba(255, 0, 0, 1.00)')
    expect(ring.style.borderWidth).toBe('2px')
    expect(ring).not.toHaveTextContent('Hanafi')
  })

  it('keeps a transparent ring on an unselected row, so selecting never shifts it', () => {
    renderScreen(<ChoiceRow title="Shafi" selected={false} onPress={() => {}} />)
    const ring = within(screen.getByRole('radio')).getByTestId('surface-ring')
    expect(ring.style.borderColor).toBe('rgba(0, 0, 0, 0.00)')
    expect(ring.style.borderWidth).toBe('2px')
  })
})
