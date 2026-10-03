import { describe, expect, it, mock } from 'bun:test'
import type { UserState } from '@ihsaanly/core/plan/user-state'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { trackingFixture } from './fixtures'
import { TrackingScreen } from './tracking'

describe('TrackingScreen', () => {
  it('toggles travelling and picks a Jumu’ah choice', async () => {
    const onChange = mock((_change: Partial<UserState>) => {})
    const { user, strings } = renderScreen(
      <TrackingScreen {...trackingFixture} onChange={onChange} />,
    )
    expect(screen.getByRole('switch', { name: strings.tracking.travelling })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(screen.getByRole('switch', { name: strings.tracking.travelling }))
    expect(onChange).toHaveBeenLastCalledWith({ travelling: false })
    expect(
      screen.getByRole('radio', { name: named(strings.tracking.jumuahChoice.auto) }),
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(strings.tracking.jumuahAutoDetail)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: strings.tracking.jumuahChoice.attend }))
    expect(onChange).toHaveBeenLastCalledWith({ jumuah: 'attend' })
  })

  it('pauses tracking when offered', async () => {
    const onChange = mock((_change: Partial<UserState>) => {})
    const { user, strings } = renderScreen(
      <TrackingScreen {...trackingFixture} onChange={onChange} />,
    )
    await user.click(screen.getByRole('switch', { name: strings.tracking.paused }))
    expect(onChange).toHaveBeenLastCalledWith({ trackingPaused: true })
  })

  it('hides the pause switch otherwise', () => {
    const { strings } = renderScreen(<TrackingScreen {...trackingFixture} showPause={false} />)
    expect(screen.queryByRole('switch', { name: strings.tracking.paused })).toBeNull()
  })

  it('offers a check-in reminder while paused, 3 to 10 days, or none', async () => {
    const onCheckInDays = mock((_days: number | null) => {})
    const paused = { ...trackingFixture.userState, trackingPaused: true }
    const { user, strings, rerender } = renderScreen(
      <TrackingScreen {...trackingFixture} userState={paused} onCheckInDays={onCheckInDays} />,
    )
    const reminder = screen.getByRole('switch', { name: strings.tracking.checkIn })
    expect(reminder).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(strings.tracking.checkInAfter(7))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: `${strings.tracking.checkInDays} +` }))
    expect(onCheckInDays).toHaveBeenLastCalledWith(8)
    await user.click(reminder)
    expect(onCheckInDays).toHaveBeenLastCalledWith(null)

    rerender(
      <TrackingScreen
        {...trackingFixture}
        userState={paused}
        checkInDays={null}
        onCheckInDays={onCheckInDays}
      />,
    )
    expect(screen.getByText(strings.tracking.checkInOff)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `${strings.tracking.checkInDays} +` })).toBeNull()
    await user.click(screen.getByRole('switch', { name: strings.tracking.checkIn }))
    expect(onCheckInDays).toHaveBeenLastCalledWith(7)
  })

  it('stops the check-in days at 3 and 10', () => {
    const paused = { ...trackingFixture.userState, trackingPaused: true }
    const { strings, rerender } = renderScreen(
      <TrackingScreen {...trackingFixture} userState={paused} checkInDays={10} />,
    )
    expect(screen.getByRole('button', { name: `${strings.tracking.checkInDays} +` })).toBeDisabled()
    rerender(<TrackingScreen {...trackingFixture} userState={paused} checkInDays={3} />)
    expect(screen.getByRole('button', { name: `${strings.tracking.checkInDays} −` })).toBeDisabled()
  })

  it('has no check-in control until tracking is paused', () => {
    const { strings } = renderScreen(<TrackingScreen {...trackingFixture} />)
    expect(screen.queryByRole('switch', { name: strings.tracking.checkIn })).toBeNull()
  })
})
