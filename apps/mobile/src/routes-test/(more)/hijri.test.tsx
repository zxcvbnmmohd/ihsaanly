import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import { MOON_SIGHTING_AUTHORITIES } from '@ihsaanly/core/content/moon-sighting'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  offset: number
  preview: unknown
  authorities: unknown
  onChange: (offset: number) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/hijri', 'HijriScreen')

const { default: HijriRoute } = await import('../../app/(more)/hijri')
const { setPlace } = await import('@ihsaanly/state/location/store')
const { getHijriOffset } = await import('@ihsaanly/state/hijri/store')

describe('hijri route', () => {
  beforeEach(() => {
    renders.length = 0
    setPlace(null)
  })

  it('passes the authorities and a date preview', () => {
    render(<HijriRoute />)
    expect(last(renders).authorities).toBe(MOON_SIGHTING_AUTHORITIES)
    expect(last(renders).preview).toBeNull()
    act(() =>
      setPlace({
        label: 'Mecca',
        latitude: 21.42,
        longitude: 39.83,
        timeZone: 'Asia/Riyadh',
        source: 'city',
      }),
    )
    expect(last(renders).preview).toMatchObject({ month: expect.any(Number) })
  })

  it('stores the chosen offset', () => {
    render(<HijriRoute />)
    act(() => last(renders).onChange(1))
    expect(getHijriOffset()).toBe(1)
    expect(last(renders).offset).toBe(1)
    act(() => last(renders).onChange(0))
  })
})
