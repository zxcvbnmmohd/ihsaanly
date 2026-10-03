import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { renderScreen } from '../../test/render'
import type { CountPanel } from '../types'
import { CounterPanel } from './counter-panel'

const panel: CountPanel = {
  kind: 'count',
  itemId: 'tasbih',
  title: 'Tasbih',
  count: 12,
  target: 33,
}
const noop = (): void => {}

describe('CounterPanel', () => {
  it('counts on a tap of its big target and shows how far along it is', async () => {
    const onCount = mock((_id: string) => {})
    const onComplete = mock((_id: string) => {})
    const { user, strings } = renderScreen(
      <CounterPanel
        panel={panel}
        onCount={onCount}
        onComplete={onComplete}
        onMarkAll={noop}
        onClose={noop}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Tasbih' })).toBeInTheDocument()
    expect(screen.getByText(strings.panel.progress(12, 33))).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: strings.today.countItem('Tasbih', 12, 33) }),
    )
    expect(onCount).toHaveBeenCalledWith('tasbih')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('completes itself once at its target', () => {
    const onComplete = mock((_id: string) => {})
    const { rerender } = renderScreen(
      <CounterPanel
        panel={{ ...panel, count: 32 }}
        onCount={noop}
        onComplete={onComplete}
        onMarkAll={noop}
        onClose={noop}
      />,
    )
    expect(onComplete).not.toHaveBeenCalled()
    const at = (count: number): ReactElement => (
      <CounterPanel
        panel={{ ...panel, count }}
        onCount={noop}
        onComplete={(id) => onComplete(id)}
        onMarkAll={noop}
        onClose={noop}
      />
    )
    rerender(at(33))
    expect(onComplete).toHaveBeenCalledWith('tasbih')
    rerender(at(34))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('marks all done and closes', async () => {
    const onMarkAll = mock((_id: string) => {})
    const onClose = mock(() => {})
    const { user, strings } = renderScreen(
      <CounterPanel
        panel={panel}
        onCount={noop}
        onComplete={noop}
        onMarkAll={onMarkAll}
        onClose={onClose}
      />,
      { scheme: 'dark' },
    )
    await user.click(screen.getByRole('button', { name: strings.panel.markAll }))
    expect(onMarkAll).toHaveBeenCalledWith('tasbih')
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
