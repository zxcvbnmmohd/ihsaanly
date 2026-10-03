import '../../../test/more'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { act, render } from '@testing-library/react'
import {
  flush,
  type LocationNative,
  last,
  mockLocationNative,
  mockScreen,
} from '../../../test/more'
import { router } from '../../../test/router'

interface Props {
  place: Place | null
  deviceLabel: string | null
  query: string
  results: Place[]
  showNoResults: boolean
  locating: boolean
  problem: string | null
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onOpenSettings: () => void
  onSelect: (place: Place) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/location', 'LocationScreen')
const native: LocationNative = mockLocationNative()
const opened: string[] = []
mock.module('expo-linking', () => ({ openSettings: async () => void opened.push('settings') }))

const { default: LocationRoute } = await import('../../app/(more)/location')
const { getPlace, setPlace } = await import('@ihsaanly/state/location/store')

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const leeds: Place = {
  label: 'Leeds',
  latitude: 53.8,
  longitude: -1.55,
  timeZone: 'Europe/London',
  source: 'city',
}

describe('location route', () => {
  beforeEach(() => {
    renders.length = 0
    opened.length = 0
    native.foreground = { granted: true }
    native.lastKnown = null
    native.current = { coords: { latitude: 51.5, longitude: -0.12 } }
    native.address = { city: 'London', region: 'England', country: 'UK' }
    setPlace(null)
  })

  it('searches cities as the query changes', () => {
    render(<LocationRoute />)
    expect(last(renders).results).toEqual([])
    expect(last(renders).showNoResults).toBe(false)
    act(() => last(renders).onQueryChange('lon'))
    expect(last(renders).query).toBe('lon')
    expect(last(renders).results.length).toBeGreaterThan(0)
    expect(last(renders).showNoResults).toBe(false)
  })

  it('says so when a long enough query finds nothing', () => {
    render(<LocationRoute />)
    act(() => last(renders).onQueryChange('zzzzqqqq'))
    expect(last(renders).results).toEqual([])
    expect(last(renders).showNoResults).toBe(true)
    act(() => last(renders).onQueryChange(' z'))
    expect(last(renders).showNoResults).toBe(false)
  })

  it('stores a chosen city and goes back', () => {
    render(<LocationRoute />)
    act(() => last(renders).onSelect(leeds))
    expect(getPlace()).toEqual(leeds)
    expect(router.calls).toEqual([['back']])
  })

  it('labels a device place, but not a city', () => {
    setPlace(leeds)
    render(<LocationRoute />)
    expect(last(renders).deviceLabel).toBeNull()
    act(() => setPlace({ ...leeds, label: 'Near you', source: 'device' }))
    expect(last(renders).deviceLabel).toBe('Near you')
  })

  it('uses the device fix, names it and goes back', async () => {
    render(<LocationRoute />)
    act(() => last(renders).onUseDevice())
    expect(last(renders).locating).toBe(true)
    await flush()
    expect(getPlace()).toMatchObject({
      label: 'London, England, UK',
      latitude: 51.5,
      longitude: -0.12,
      source: 'device',
    })
    expect(router.calls).toEqual([['back']])
  })

  it('reports a declined permission and stops locating', async () => {
    native.foreground = { granted: false }
    render(<LocationRoute />)
    act(() => last(renders).onUseDevice())
    await flush()
    expect(last(renders).locating).toBe(false)
    expect(last(renders).problem).toBe('declined')
    expect(getPlace()).toBeNull()
    expect(router.calls).toEqual([])
  })

  it('reports an unavailable fix', async () => {
    native.current = new Error('no fix')
    render(<LocationRoute />)
    act(() => last(renders).onUseDevice())
    await flush()
    expect(last(renders).problem).toBe('unavailable')
    expect(last(renders).locating).toBe(false)
  })

  it('does not stay on "Finding you" when the platform call itself throws', async () => {
    const original = native.foreground
    Object.defineProperty(native, 'foreground', {
      configurable: true,
      get: () => {
        throw new Error('services off')
      },
    })
    render(<LocationRoute />)
    act(() => last(renders).onUseDevice())
    await flush()
    Object.defineProperty(native, 'foreground', {
      configurable: true,
      writable: true,
      value: original,
    })
    expect(last(renders).problem).toBe('unavailable')
    expect(last(renders).locating).toBe(false)
  })

  it('opens system settings', async () => {
    render(<LocationRoute />)
    act(() => last(renders).onOpenSettings())
    await settle()
    expect(opened).toEqual(['settings'])
  })
})
