import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace } from '@ihsaanly/state/location/store'
import { resumeTracking } from '@ihsaanly/state/plan/user-state-store'
import { act, renderHook } from '@testing-library/react'

import { themePreferenceStore } from '@/theme/preference'
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

// Another file may leave a place behind; the sample shows only without one.
beforeEach(() => {
  act(() => setPlace(null))
})

afterEach(() => {
  act(() => {
    themePreferenceStore.set('system')
    setPlace(null)
  })
})

describe('useWidgetPreview', () => {
  it('shows the sample in the chosen theme until there is a place', () => {
    // Another file may leave a place behind.
    act(() => {
      setPlace(null)
      themePreferenceStore.set('midnight')
    })
    const { result } = renderHook(() => useWidgetPreview())
    expect(result.current.rightNow?.title).toBe(sample.rightNow.title)
    expect(result.current.ink).toEqual(widgetInk('midnight'))
  })

  it("is the widgets' current entry once there is a place, in the city and theme chosen", () => {
    // Prayers are listed only while tracking runs; another file may leave it paused.
    act(() => {
      resumeTracking()
      setPlace(london)
      themePreferenceStore.set('sage')
    })
    const { result } = renderHook(() => useWidgetPreview())
    expect(result.current.stale).toBe(false)
    expect(result.current.date.place).toBe('London')
    expect(result.current.ink).toEqual(widgetInk('sage'))
    expect(result.current.prayers).toHaveLength(5)
    expect(result.current.at).toBeLessThanOrEqual(Date.now())
  })
})
