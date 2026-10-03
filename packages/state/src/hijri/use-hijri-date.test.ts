import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { setPlace } = await import('../location/store')
const { setHijriOffset } = await import('./store')
const { useHijriDate } = await import('./use-hijri-date')

const london = {
  label: 'London',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const

describe('useHijriDate', () => {
  beforeEach(resetStorage)

  it('has no date until the person has a place', () => {
    const { result } = renderHook(() => useHijriDate())
    expect(result.current).toBeNull()
  })

  it('gives the Hijri date once there is a place', () => {
    const { result } = renderHook(() => useHijriDate())

    act(() => setPlace(london))

    expect(result.current?.month).toBeGreaterThanOrEqual(1)
    expect(result.current?.month).toBeLessThanOrEqual(12)
    expect(result.current?.day).toBeGreaterThanOrEqual(1)
    expect(result.current?.day).toBeLessThanOrEqual(30)
    expect(result.current?.year).toBeGreaterThan(1440)
  })

  it('moves the date by the offset the person chose', () => {
    setPlace(london)
    const { result } = renderHook(() => useHijriDate())
    const before = result.current

    act(() => setHijriOffset(1))

    expect(result.current).not.toEqual(before)
  })
})
