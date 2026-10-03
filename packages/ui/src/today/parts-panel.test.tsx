import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import type { PartsPanel as PartsPanelValue } from '../types'
import { PartsPanel } from './parts-panel'

const panel: PartsPanelValue = {
  kind: 'parts',
  itemId: 'evening',
  title: 'Evening adhkar',
  parts: [
    { id: 'p1', title: 'Ayat al-Kursi', done: true },
    { id: 'p2', title: 'The three Quls', done: false },
  ],
}
const noop = (): void => {}

describe('PartsPanel', () => {
  it('lists the parts as checkboxes with progress, and toggles one', async () => {
    const onTogglePart = mock((_item: string, _part: string) => {})
    const { user, strings } = renderScreen(
      <PartsPanel panel={panel} onTogglePart={onTogglePart} onMarkAll={noop} onClose={noop} />,
      { scheme: 'dark' },
    )
    expect(screen.getByText(strings.panel.progress(1, 2))).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Ayat al-Kursi' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const quls = screen.getByRole('checkbox', { name: 'The three Quls' })
    expect(quls).toHaveAttribute('aria-checked', 'false')
    await user.click(quls)
    expect(onTogglePart).toHaveBeenLastCalledWith('evening', 'p2')
    fireEvent.keyDown(quls, { key: ' ' })
    expect(onTogglePart).toHaveBeenCalledTimes(2)
  })

  it('marks all done and closes', async () => {
    const onMarkAll = mock((_id: string) => {})
    const onClose = mock(() => {})
    const { user, strings } = renderScreen(
      <PartsPanel panel={panel} onTogglePart={noop} onMarkAll={onMarkAll} onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: strings.panel.markAll }))
    expect(onMarkAll).toHaveBeenCalledWith('evening')
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
