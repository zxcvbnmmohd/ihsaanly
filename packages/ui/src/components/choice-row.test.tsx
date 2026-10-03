import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
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
})
