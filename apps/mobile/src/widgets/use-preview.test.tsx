import { afterEach, describe, expect, it } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace } from '@ihsaanly/state/location/store'
import { resumeTracking } from '@ihsaanly/state/plan/user-state-store'
import { setAccent } from '@ihsaanly/state/theme/accent-store'
import { act, renderHook } from '@testing-library/react'

import { widgetInk } from './model'
import sample from './sample.json'
import { useWidgetPreview } from './use-preview'

const london: Place = {
  label: 'London, United Kingdom',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
}

afterEach(() => {
  act(() => {
    setAccent('terracotta')
    setPlace(null)
  })
})

describe('useWidgetPreview', () => {
  it('shows the sample in the chosen accent until there is a place', () => {
    // Another file in the run may leave a city chosen; this case is about having none.
    act(() => {
      setPlace(null)
      setAccent('denim')
    })
    const { result } = renderHook(() => useWidgetPreview())
    expect(result.current.rightNow?.title).toBe(sample.rightNow.title)
    expect(result.current.ink).toEqual(widgetInk('denim'))
  })

  it("is the widgets' current entry once there is a place, in the city and accent chosen", () => {
    // Prayers are listed only while tracking runs; another file may leave it paused.
    act(() => {
      resumeTracking()
      setPlace(london)
      setAccent('sage')
    })
    const { result } = renderHook(() => useWidgetPreview())
    expect(result.current.stale).toBe(false)
    expect(result.current.date.place).toBe('London')
    expect(result.current.ink).toEqual(widgetInk('sage'))
    expect(result.current.prayers).toHaveLength(5)
    expect(result.current.at).toBeLessThanOrEqual(Date.now())
  })
})
