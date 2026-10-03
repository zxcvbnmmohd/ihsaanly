import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import { getStrings } from '@ihsaanly/state/strings'
import { installLocation, location, resetLocation } from '../../test/location'

const fake = location

installLocation()
const { requestDeviceLocation } = await import('./device')

beforeEach(() => {
  resetLocation()
  installLocation()
})

afterEach(() => jest.useRealTimers())

describe('requestDeviceLocation', () => {
  it('is declined when permission is refused, without trying for a fix', async () => {
    fake.foreground = { granted: false }
    expect(await requestDeviceLocation()).toEqual({ status: 'declined' })
    expect(fake.lastKnownCalls).toEqual([])
  })

  it('takes a fix of the last hour without waking the GPS', async () => {
    fake.lastKnown = { coords: { latitude: 10, longitude: 20 } }
    const result = await requestDeviceLocation()
    expect(fake.lastKnownCalls).toEqual([{ maxAge: 3_600_000 }])
    expect(fake.currentCalls).toEqual([])
    expect(result).toMatchObject({
      status: 'ok',
      place: {
        label: 'London, England, UK',
        latitude: 10,
        longitude: 20,
        source: 'device',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })
  })

  it('asks for a low-accuracy fresh fix when there is no recent one', async () => {
    const result = await requestDeviceLocation()
    expect(fake.currentCalls).toEqual([{ accuracy: 2 }])
    expect(result).toMatchObject({ status: 'ok', place: { latitude: 51.5, longitude: -0.12 } })
  })

  it('names the place from whichever parts the address has', async () => {
    fake.address = [{ city: null, region: 'Dubai', country: 'UAE' }]
    const result = await requestDeviceLocation()
    expect(result).toMatchObject({ place: { label: 'Dubai, UAE' } })
  })

  it('falls back to the generic label when the address is empty', async () => {
    fake.address = [{}]
    expect(await requestDeviceLocation()).toMatchObject({
      place: { label: getStrings().location.currentLocation },
    })
    fake.address = []
    expect(await requestDeviceLocation()).toMatchObject({
      place: { label: getStrings().location.currentLocation },
    })
  })

  it('falls back to the generic label when reverse geocoding throws', async () => {
    fake.address = new Error('offline')
    expect(await requestDeviceLocation()).toMatchObject({
      status: 'ok',
      place: { label: getStrings().location.currentLocation },
    })
  })

  it('is unavailable when the fix throws, such as services being switched off', async () => {
    fake.current = async () => {
      throw new Error('Location services are disabled')
    }
    expect(await requestDeviceLocation()).toEqual({ status: 'unavailable' })
  })

  it('gives up after twelve seconds instead of waiting forever', async () => {
    jest.useFakeTimers()
    fake.current = () => new Promise(() => {})
    const pending = requestDeviceLocation()
    // let the permission and last-known awaits settle before the timer exists
    for (let i = 0; i < 10; i++) await Promise.resolve()
    jest.advanceTimersByTime(11_999)
    let settled = false
    void pending.then(() => {
      settled = true
    })
    for (let i = 0; i < 10; i++) await Promise.resolve()
    expect(settled).toBe(false)
    jest.advanceTimersByTime(1)
    expect(await pending).toEqual({ status: 'unavailable' })
  })
})
