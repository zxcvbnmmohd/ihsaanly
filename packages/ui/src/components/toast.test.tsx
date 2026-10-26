import { afterEach, describe, expect, it, jest, mock, spyOn } from 'bun:test'
import { act, screen } from '@testing-library/react'
import { AccessibilityInfo } from 'react-native'
import { renderScreen } from '../../test/render'
import { UNDO_MS } from '../types'
import { Toast, type ToastMessage } from './toast'

afterEach(() => {
  jest.useRealTimers()
  process.env.EXPO_OS = 'web'
})

describe('Toast', () => {
  it('says its message in a polite live region, and runs its action', async () => {
    const onPress = mock(() => {})
    const { user } = renderScreen(
      <Toast
        toast={{ id: '1', text: 'Marked from your widget', action: { label: 'Undo', onPress } }}
        onDismiss={() => {}}
      />,
    )
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('Marked from your widget')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows a message with no action, in the dark scheme', () => {
    renderScreen(<Toast toast={{ id: '1', text: 'Saved' }} onDismiss={() => {}} offset={80} />, {
      scheme: 'dark',
    })
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('announces each new message outright on iOS', () => {
    process.env.EXPO_OS = 'ios'
    const announce = spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(
      () => {},
    )
    const { rerender } = renderScreen(
      <Toast toast={{ id: '1', text: 'One' }} onDismiss={() => {}} />,
    )
    rerender(<Toast toast={{ id: '1', text: 'One' }} onDismiss={() => {}} />)
    rerender(<Toast toast={{ id: '2', text: 'Two' }} onDismiss={() => {}} />)
    expect(announce.mock.calls).toEqual([['One'], ['Two']])
    announce.mockRestore()
  })

  it('dismisses itself after its duration, restarting for each new toast only', () => {
    jest.useFakeTimers()
    const onDismiss = mock(() => {})
    const first: ToastMessage = { id: '1', text: 'One' }
    const { rerender } = renderScreen(
      <Toast toast={first} onDismiss={onDismiss} durationMs={UNDO_MS * 2} />,
    )
    act(() => jest.advanceTimersByTime(UNDO_MS * 2 - 1000))
    // The same toast with a fresh handler keeps its timer.
    rerender(<Toast toast={{ ...first }} onDismiss={() => onDismiss()} durationMs={UNDO_MS * 2} />)
    act(() => jest.advanceTimersByTime(1000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    rerender(<Toast toast={null} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(UNDO_MS * 2))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
