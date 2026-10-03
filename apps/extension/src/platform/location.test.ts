import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { requestDeviceLocation } from './location'

type Success = (position: { coords: { latitude: number; longitude: number } }) => void
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void

let request: { success: Success; failure: Failure; options: PositionOptions } | null = null
const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

function geolocation(value: unknown): void {
  Object.defineProperty(navigator, 'geolocation', { value, configurable: true })
}

beforeEach(() => {
  request = null
  geolocation({
    getCurrentPosition: (success: Success, failure: Failure, options: PositionOptions) => {
      request = { success, failure, options }
    },
  })
})

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'geolocation', original)
  else delete (navigator as unknown as Record<string, unknown>).geolocation
})

describe('requestDeviceLocation', () => {
  it('asks for a fix with the native timeout and an hour of tolerance', async () => {
    const pending = requestDeviceLocation()
    expect(request?.options).toEqual({ timeout: 12_000, maximumAge: 3_600_000 })
    request?.success({ coords: { latitude: 51.5, longitude: -0.12 } })
    await pending
  })

  it('names the nearest city in our table', async () => {
    const pending = requestDeviceLocation()
    request?.success({ coords: { latitude: 51.5074, longitude: -0.1278 } })
    const located = await pending
    expect(located.status).toBe('ok')
    if (located.status !== 'ok') return
    expect(located.place).toMatchObject({
      latitude: 51.5074,
      longitude: -0.1278,
      source: 'device',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    expect(located.place.label).toContain('London')
  })

  it('is declined when the person says no', async () => {
    const pending = requestDeviceLocation()
    request?.failure({ code: 1, PERMISSION_DENIED: 1 })
    expect(await pending).toEqual({ status: 'declined' })
  })

  it('is unavailable when the position cannot be found', async () => {
    const pending = requestDeviceLocation()
    request?.failure({ code: 2, PERMISSION_DENIED: 1 })
    expect(await pending).toEqual({ status: 'unavailable' })
  })

  it('is unavailable without geolocation at all', async () => {
    geolocation(undefined)
    expect(await requestDeviceLocation()).toEqual({ status: 'unavailable' })
  })

  it('rejects when the position cannot be read', async () => {
    const pending = requestDeviceLocation()
    const broken = {
      get latitude(): number {
        throw new Error('bad fix')
      },
      longitude: 0,
    }
    request?.success({ coords: broken })
    await expect(pending).rejects.toThrow('bad fix')
  })

  it('gives up after the guard when the browser never answers', async () => {
    const realSetTimeout = window.setTimeout
    let fire: (() => void) | undefined
    let delay = 0
    window.setTimeout = ((handler: () => void, ms: number) => {
      fire = handler
      delay = ms
      return 1
    }) as unknown as typeof window.setTimeout
    try {
      const pending = requestDeviceLocation()
      expect(delay).toBe(15_000)
      fire?.()
      expect(await pending).toEqual({ status: 'unavailable' })
    } finally {
      window.setTimeout = realSetTimeout
    }
  })
})
