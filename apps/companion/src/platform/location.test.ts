import { afterEach, beforeEach, expect, it } from 'bun:test'
import { requestDeviceLocation } from './location'

type Success = (position: { coords: { latitude: number; longitude: number } }) => void
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void

const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

function geolocation(
  run: (success: Success, failure: Failure, options: PositionOptions | undefined) => void,
): void {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success: Success, failure: Failure, options?: PositionOptions) =>
        run(success, failure, options),
    },
  })
}

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
})

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'geolocation', original)
  else Reflect.deleteProperty(navigator, 'geolocation')
})

it('is unavailable where the browser has no geolocation', async () => {
  expect(await requestDeviceLocation()).toEqual({ status: 'unavailable' })
})

it('names a fix after the nearest city, keeping the exact coordinates', async () => {
  let options: PositionOptions | undefined
  geolocation((success, _failure, given) => {
    options = given
    success({ coords: { latitude: 51.5, longitude: -0.12 } })
  })
  const result = await requestDeviceLocation()
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') return
  expect(result.place).toMatchObject({ latitude: 51.5, longitude: -0.12, source: 'device' })
  expect(result.place.label).toContain('London')
  expect(result.place.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  expect(options).toEqual({ timeout: 12_000, maximumAge: 3_600_000 })
})

it('maps a refusal to declined and any other failure to unavailable', async () => {
  geolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }))
  expect(await requestDeviceLocation()).toEqual({ status: 'declined' })
  geolocation((_success, failure) => failure({ code: 2, PERMISSION_DENIED: 1 }))
  expect(await requestDeviceLocation()).toEqual({ status: 'unavailable' })
})

it('rejects when the position cannot be read', async () => {
  geolocation((success) =>
    success({
      get coords(): never {
        throw new Error('broken coords')
      },
    } as never),
  )
  await expect(requestDeviceLocation()).rejects.toThrow('broken coords')
})

it('gives up after the guard timeout when the browser never answers', async () => {
  const original = window.setTimeout
  let fire: (() => void) | undefined
  let delay = 0
  window.setTimeout = ((callback: () => void, ms: number) => {
    fire = callback
    delay = ms
    return 1
  }) as unknown as typeof window.setTimeout
  try {
    geolocation(() => {})
    const pending = requestDeviceLocation()
    expect(delay).toBe(15_000)
    fire?.()
    expect(await pending).toEqual({ status: 'unavailable' })
  } finally {
    window.setTimeout = original
  }
})
