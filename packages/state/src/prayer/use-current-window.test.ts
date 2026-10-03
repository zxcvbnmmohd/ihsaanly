import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { setPlace } = await import('../location/store')
const { useCurrentWindow } = await import('./use-current-window')

const london = {
  label: 'London',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const

describe('useCurrentWindow', () => {
  beforeEach(resetStorage)

  it('has no window without a place', () => {
    const { result } = renderHook(() => useCurrentWindow())
    expect(result.current).toBeNull()
  })

  it('finds the window the clock is in once there is a place', () => {
    const { result } = renderHook(() => useCurrentWindow())

    act(() => setPlace(london))

    const window = result.current
    expect(window).not.toBeNull()
    expect(window?.startsAt.getTime()).toBeLessThanOrEqual(Date.now())
    expect(window?.endsAt.getTime()).toBeGreaterThan(Date.now())
  })
})
