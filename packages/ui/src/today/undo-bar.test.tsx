import { afterEach, describe, expect, it, jest, mock } from 'bun:test'
import { act, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { type TodayUndo, UNDO_MS } from '../types'
import { UndoBar } from './undo-bar'

afterEach(() => {
  jest.useRealTimers()
})

describe('UndoBar', () => {
  it('says what was marked in a polite live region, and undoes it', async () => {
    const onUndo = mock(() => {})
    const { user, strings } = renderScreen(
      <UndoBar undo={{ id: '1', title: 'Duha', onUndo }} onDismiss={() => {}} />,
    )
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent(strings.today.markedDone)
    await user.click(screen.getByRole('button', { name: strings.today.undoItem('Duha') }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('keeps an empty live region when there is nothing to undo', () => {
    renderScreen(<UndoBar undo={null} onDismiss={() => {}} />, { scheme: 'dark' })
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('dismisses itself after UNDO_MS, restarting for each new mark only', () => {
    jest.useFakeTimers()
    const onDismiss = mock(() => {})
    const first: TodayUndo = { id: '1', title: 'Duha', onUndo: () => {} }
    const { rerender } = renderScreen(<UndoBar undo={first} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(UNDO_MS - 1000))
    // The same mark with fresh handlers keeps its timer.
    rerender(<UndoBar undo={{ ...first, onUndo: () => {} }} onDismiss={() => onDismiss()} />)
    act(() => jest.advanceTimersByTime(1000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    rerender(<UndoBar undo={{ ...first, id: '2' }} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(UNDO_MS - 1))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    rerender(<UndoBar undo={null} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(UNDO_MS))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
