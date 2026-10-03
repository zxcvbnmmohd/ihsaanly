import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { getPlace } from '@ihsaanly/state/location/store'
import { screen, waitFor } from '@testing-library/react'
import { fakeChrome } from '../../test/chrome'
import { renderRoute, resetApp, strings } from '../../test/route'

const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

type Success = (position: { coords: { latitude: number; longitude: number } }) => void
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void

function geolocation(answer: (success: Success, failure: Failure) => void): void {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: answer },
  })
}

beforeEach(resetApp)
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'geolocation', original)
  else delete (navigator as unknown as Record<string, unknown>).geolocation
})

describe('/location', () => {
  it('searches cities and saves the chosen one as the place', async () => {
    const { user } = await renderRoute('/location')
    await user.type(await screen.findByPlaceholderText(strings.location.search), 'London')

    await user.click(await screen.findByText('London, Westminster, United Kingdom'))

    expect(getPlace()?.label).toBe('London, Westminster, United Kingdom')
    expect(getPlace()?.source).not.toBe('device')
  })

  it('says so when no city matches', async () => {
    const { user } = await renderRoute('/location')
    expect(screen.queryByText(strings.location.noResults)).toBeNull()
    await user.type(await screen.findByPlaceholderText(strings.location.search), 'zzzzqqqq')
    expect(await screen.findByText(strings.location.noResults)).toBeInTheDocument()
  })

  it('uses the device location: shows progress, then saves the place', async () => {
    let answer: Success = () => {}
    geolocation((success) => {
      answer = success
    })
    const { user } = await renderRoute('/location')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.locating)).toBeInTheDocument()

    answer({ coords: { latitude: 51.5074, longitude: -0.1278 } })

    await waitFor(() => expect(getPlace()?.source).toBe('device'))
    expect(getPlace()?.label).toContain('London')
  })

  it('offers search instead when access is declined, and has no settings page to open', async () => {
    geolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }))
    const { user } = await renderRoute('/location')
    await user.click(await screen.findByText(strings.location.useDevice))

    expect(await screen.findByText(strings.location.declined)).toBeInTheDocument()
    await user.click(screen.getByText(strings.notifications.openSettings))
    expect(fakeChrome.tabsCreated).toEqual([])
    expect(getPlace()).toBeNull()
  })

  it('reports services switched off when the position is unavailable', async () => {
    geolocation((_success, failure) => failure({ code: 2, PERMISSION_DENIED: 1 }))
    const { user } = await renderRoute('/location')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.unavailable)).toBeInTheDocument()
  })

  it('reports unavailable when reading the position blows up', async () => {
    geolocation((success) =>
      success({
        coords: {
          get latitude(): number {
            throw new Error('bad fix')
          },
          longitude: 0,
        },
      }),
    )
    const { user } = await renderRoute('/location')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.unavailable)).toBeInTheDocument()
  })
})
