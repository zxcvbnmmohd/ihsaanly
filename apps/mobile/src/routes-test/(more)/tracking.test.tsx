import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { UserState } from '@ihsaanly/core/plan/user-state'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  userState: UserState
  showPause: boolean
  onChange: (change: Partial<UserState>) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/tracking', 'TrackingScreen')

const { default: TrackingRoute } = await import('../../app/(more)/tracking')
const { setOnboarding } = await import('@ihsaanly/state/onboarding/store')
const { getUserState } = await import('@ihsaanly/state/plan/user-state-store')

describe('tracking route', () => {
  beforeEach(() => {
    renders.length = 0
    setOnboarding({ completed: true, gender: 'unspecified' })
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
})
