import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Panel } from './panel'

describe('Panel', () => {
  it('is just the content at compact', () => {
    renderScreen(
      <Panel title="Details" onClose={() => {}}>
        <span>Body</span>
      </Panel>,
      { layout: 'compact' },
    )
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.queryByText('Details')).toBeNull()
  })

  it.each(['regular', 'wide'] as const)('is a titled pane that closes at %s', async (layout) => {
    const onClose = mock(() => {})
    const { user, strings } = renderScreen(
      <Panel title="Details" onClose={onClose}>
        <span>Body</span>
      </Panel>,
      { layout },
    )
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
