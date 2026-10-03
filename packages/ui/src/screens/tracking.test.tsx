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
})
