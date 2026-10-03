import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import type { EventSettings } from '@ihsaanly/state/events/store'
import { act, render } from '@testing-library/react'
import { type LocationNative, last, mockLocationNative, mockScreen } from '../../../test/more'

interface Props {
  settings: EventSettings
  canSetHome: boolean
  locationHref: string
  onToggleDetectHome: () => void
  onSetHome: () => void
  onToggleManual: (event: string) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/events', 'EventsScreen')
const native: LocationNative = mockLocationNative()

const { default: EventsRoute } = await import('../../app/(more)/events')
const { DEFAULT_EVENT_SETTINGS, getEventSettings, setEventSettings } = await import(
  '@ihsaanly/state/events/store'
)
const { setPlace } = await import('@ihsaanly/state/location/store')

const place: Place = {
  label: 'Leeds',
  latitude: 53.8,
  longitude: -1.55,
  timeZone: 'Europe/London',
  source: 'city',
}
const home = { latitude: 53.8, longitude: -1.55, label: 'Leeds' }
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('events route', () => {
  beforeEach(() => {
    renders.length = 0
    native.started.length = 0
    native.stopped.length = 0
    native.registered = true
    native.foreground = { granted: true }
    native.background = { granted: true }
    setEventSettings(DEFAULT_EVENT_SETTINGS)
    setPlace(null)
  })

  it('can set a home only when a place is chosen', () => {
    render(<EventsRoute />)
    expect(last(renders).canSetHome).toBe(false)
    expect(last(renders).locationHref).toBe('/location')
    act(() => setPlace(place))
    expect(last(renders).canSetHome).toBe(true)
  })

  it('ignores Set home without a place', async () => {
    render(<EventsRoute />)
    act(() => last(renders).onSetHome())
    await settle()
    expect(getEventSettings().home).toEqual(DEFAULT_EVENT_SETTINGS.home)
    expect(native.started).toEqual([])
  })

  it('stores the place as home without monitoring while detection is off', async () => {
    setPlace(place)
    render(<EventsRoute />)
    act(() => last(renders).onSetHome())
    await settle()
    expect(getEventSettings().home).toEqual(home)
    expect(native.started).toEqual([])
  })

  it('starts monitoring a new home while detection is on', async () => {
    setPlace(place)
    setEventSettings({ ...DEFAULT_EVENT_SETTINGS, detectHome: true })
    render(<EventsRoute />)
    act(() => last(renders).onSetHome())
    await settle()
    expect(getEventSettings().home).toEqual(home)
    expect(native.started).toHaveLength(1)
  })

  it('turning detection on monitors the stored home', async () => {
    setEventSettings({ ...DEFAULT_EVENT_SETTINGS, home })
    render(<EventsRoute />)
    act(() => last(renders).onToggleDetectHome())
    await settle()
    expect(getEventSettings().detectHome).toBe(true)
    expect(native.started).toHaveLength(1)
  })

  it('turning detection on with no home monitors nothing', async () => {
    render(<EventsRoute />)
    act(() => last(renders).onToggleDetectHome())
    await settle()
    expect(getEventSettings().detectHome).toBe(true)
    expect(native.started).toEqual([])
  })

  it('turning detection off stops monitoring', async () => {
    setEventSettings({ ...DEFAULT_EVENT_SETTINGS, home, detectHome: true })
    render(<EventsRoute />)
    act(() => last(renders).onToggleDetectHome())
    await settle()
    expect(getEventSettings().detectHome).toBe(false)
    expect(native.stopped).toEqual(['ihsaanly-home-region'])
  })

  it('toggles a manual event on and off', () => {
    render(<EventsRoute />)
    act(() => last(renders).onToggleManual('travel'))
    act(() => last(renders).onToggleManual('ill'))
    expect(getEventSettings().manual).toEqual(['travel', 'ill'])
    act(() => last(renders).onToggleManual('travel'))
    expect(getEventSettings().manual).toEqual(['ill'])
  })
})
