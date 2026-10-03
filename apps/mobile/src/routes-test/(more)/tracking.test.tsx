import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { UserState } from '@ihsaanly/core/plan/user-state'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { CHECK_IN_DAYS } from '@ihsaanly/ui/types'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  userState: UserState
  showPause: boolean
  onChange: (change: Partial<UserState>) => void
  checkInDays: number | null
  onCheckInDays: (days: number | null) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/tracking', 'TrackingScreen')

const { default: TrackingRoute } = await import('../../app/(more)/tracking')
const { setOnboarding } = await import('@ihsaanly/state/onboarding/store')
const { getUserState, setUserState } = await import('@ihsaanly/state/plan/user-state-store')

describe('tracking route', () => {
  beforeEach(() => {
    renders.length = 0
    setOnboarding({ completed: true, gender: 'unspecified' })
    setUserState(DEFAULT_USER_STATE)
  })

  it('offers the pause unless the user is known to be male', () => {
    render(<TrackingRoute />)
    expect(last(renders).showPause).toBe(true)
    act(() => setOnboarding({ completed: true, gender: 'male' }))
    expect(last(renders).showPause).toBe(false)
  })

  it('merges a change into the stored user state', () => {
    render(<TrackingRoute />)
    const before = last(renders).userState
    const key = Object.keys(before)[0] as keyof UserState
    const flipped = { [key]: !before[key] } as Partial<UserState>
    act(() => last(renders).onChange(flipped))
    expect(getUserState()).toEqual({ ...before, ...flipped })
  })

  it('pauses with the chosen check-in and offers the default before pausing', () => {
    render(<TrackingRoute />)
    expect(last(renders).checkInDays).toBe(CHECK_IN_DAYS.initial)
    act(() => last(renders).onCheckInDays(5))
    expect(getUserState().trackingPaused).toBe(false)
    expect(last(renders).checkInDays).toBe(5)
    act(() => last(renders).onChange({ trackingPaused: true }))
    expect(getUserState().trackingPaused).toBe(true)
    expect(getUserState().pauseCheckInOn).not.toBeNull()
    expect(last(renders).checkInDays).toBe(5)
  })

  it('changes and clears the check-in while paused, and resumes', () => {
    render(<TrackingRoute />)
    act(() => last(renders).onChange({ trackingPaused: true }))
    act(() => last(renders).onCheckInDays(9))
    expect(last(renders).checkInDays).toBe(9)
    act(() => last(renders).onCheckInDays(null))
    expect(getUserState().pauseCheckInOn).toBeNull()
    expect(last(renders).checkInDays).toBeNull()
    act(() => last(renders).onChange({ trackingPaused: false }))
    expect(getUserState().trackingPaused).toBe(false)
    expect(last(renders).checkInDays).toBeNull()
  })

  it('clamps a stored check-in date that is out of range', () => {
    act(() =>
      setUserState({ ...DEFAULT_USER_STATE, trackingPaused: true, pauseCheckInOn: '2000-01-01' }),
    )
    render(<TrackingRoute />)
    expect(last(renders).checkInDays).toBe(CHECK_IN_DAYS.min)
  })
})
