import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Sheet } from './sheet'

describe.each(['compact', 'wide'] as const)('Sheet at %s', (layout) => {
  it('is a labelled modal dialog that closes from its button and its scrim', async () => {
    const onClose = mock(() => {})
    const { user, strings } = renderScreen(
      <Sheet title="Tasbih" onClose={onClose}>
        <span>body</span>
      </Sheet>,
      { layout },
    )
    const dialog = screen.getByRole('dialog', { name: 'Tasbih' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Tasbih' })).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    await user.click(screen.getByTestId('sheet-scrim'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('Sheet', () => {
  it('closes on Escape once it has finished opening', async () => {
    const onClose = mock(() => {})
    const { user } = renderScreen(
      <Sheet title="Tasbih" onClose={onClose}>
        <span>body</span>
      </Sheet>,
    )
    // react-native-web makes a modal active (Escape, focus trap) when its
    // open animation ends, which a DOM without CSS animations never fires.
    for (const element of document.body.querySelectorAll('*')) fireEvent.animationEnd(element)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
