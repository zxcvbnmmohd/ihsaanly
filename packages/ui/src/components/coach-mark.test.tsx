import { afterEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { AccessibilityInfo, View, type ViewProps } from 'react-native'
import { renderScreen } from '../../test/render'
import { CoachMark, type CoachMarkProps } from './coach-mark'

const noop = (): void => {}
const props: CoachMarkProps = {
  text: 'Tap a circle',
  step: 0,
  total: 3,
  onNext: noop,
  onSkip: noop,
  arrowAt: '30%',
}

afterEach(() => {
  process.env.EXPO_OS = 'web'
})

describe('CoachMark', () => {
  it('shows its tip, which step it is, Skip and Next, and focuses Next', async () => {
    const onNext = mock(() => {})
    const onSkip = mock(() => {})
    const { user, strings } = renderScreen(<CoachMark {...props} onNext={onNext} onSkip={onSkip} />)
    expect(screen.getByRole('dialog', { name: strings.tour.step(1, 3) })).toBeInTheDocument()
    expect(screen.getByText('Tap a circle')).toBeInTheDocument()
    expect(screen.getByText(strings.tour.step(1, 3))).toBeInTheDocument()
    const next = screen.getByRole('button', { name: strings.tour.next })
    expect(next).toHaveFocus()
    await user.click(next)
    await user.click(screen.getByRole('button', { name: strings.tour.skip }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('says Got it on the last step, with no Skip', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<CoachMark {...props} step={2} onNext={onNext} />)
    expect(screen.queryByRole('button', { name: strings.tour.skip })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.tour.done }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('skips on Escape and ignores other keys', async () => {
    const onSkip = mock(() => {})
    const { user } = renderScreen(<CoachMark {...props} onSkip={onSkip} />)
    await user.keyboard('a')
    expect(onSkip).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('points its arrow from the start edge, so it mirrors right to left', () => {
    renderScreen(
      // react-native-web's own right-to-left context, as a host page in Arabic sets.
      <View {...({ dir: 'rtl' } as ViewProps)}>
        <CoachMark {...props} arrowAt={30} />
      </View>,
      { locale: 'ar', scheme: 'dark' },
    )
    const arrow = screen.getByTestId('coach-arrow')
    expect(arrow.getAttribute('style')).toContain('right: 30px')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('draws no arrow with nothing to point at', () => {
    renderScreen(<CoachMark {...props} arrowAt={null} />)
    expect(screen.queryByTestId('coach-arrow')).toBeNull()
  })

  it('moves screen-reader focus on native', () => {
    process.env.EXPO_OS = 'ios'
    const send = mock((_node: unknown, _event: string) => {})
    const original = AccessibilityInfo.sendAccessibilityEvent
    AccessibilityInfo.sendAccessibilityEvent = send as typeof original
    try {
      renderScreen(<CoachMark {...props} />)
      expect(send).toHaveBeenCalledTimes(1)
      expect(send.mock.calls[0]?.[1]).toBe('focus')
    } finally {
      AccessibilityInfo.sendAccessibilityEvent = original
    }
  })

  it('skips from the native escape gesture too', () => {
    const onSkip = mock(() => {})
    renderScreen(<CoachMark {...props} onSkip={onSkip} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
