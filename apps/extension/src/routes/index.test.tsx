import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { getPlace, setPlace } from '@ihsaanly/state/location/store'
import { setOnboarding } from '@ihsaanly/state/onboarding/store'
import { getEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { getSuggestion } from '@ihsaanly/state/plan/suggestion-store'
import { setBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { screen, waitFor, within } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

const makkah: Place = {
  label: 'Makkah, Saudi Arabia',
  latitude: 21.4225,
  longitude: 39.8262,
  timeZone: 'Asia/Riyadh',
  source: 'city',
}

const geolocationDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

type Success = (position: { coords: { latitude: number; longitude: number } }) => void
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void

function geolocation(answer: (success: Success, failure: Failure) => void): void {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: answer },
  })
}

/** Midday in Makkah, in Ramadan 1448, so every prayer window and the fasting row are in play. */
const RAMADAN = new Date('2027-02-20T09:00:00Z')

beforeEach(() => {
  resetApp()
  setSystemTime(RAMADAN)
})
afterEach(() => {
  setSystemTime()
  if (geolocationDescriptor) Object.defineProperty(navigator, 'geolocation', geolocationDescriptor)
  else delete (navigator as unknown as Record<string, unknown>).geolocation
})

describe('Today without a place', () => {
  it('asks for a location and offers the city list as the other way', async () => {
    const { router } = await renderRoute('/')
    expect(await screen.findByText(strings.today.needsLocationTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.today.chooseCity)).toBeInTheDocument()
    // The title is Today, and there is no back button on a tab.
    expect(screen.getByRole('heading', { name: strings.today.title })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.onboarding.back })).toBeNull()
    expect(router.state.location.pathname).toBe('/')
  })

  it('uses the device location, then shows the day', async () => {
    let answer: Success = () => {}
    geolocation((success) => {
      answer = success
    })
    const { user } = await renderRoute('/')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.locating)).toBeInTheDocument()

    answer({ coords: { latitude: 21.4225, longitude: 39.8262 } })

    await waitFor(() => expect(getPlace()?.source).toBe('device'))
    expect(await screen.findByRole('checkbox', { name: strings.prayer.fajr })).toBeInTheDocument()
  })

  it('says why when access is declined', async () => {
    geolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }))
    const { user } = await renderRoute('/')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.declined)).toBeInTheDocument()
    expect(getPlace()).toBeNull()
  })

  it('says why when the position cannot be read', async () => {
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
    const { user } = await renderRoute('/')
    await user.click(await screen.findByText(strings.location.useDevice))
    expect(await screen.findByText(strings.location.unavailable)).toBeInTheDocument()
  })
})

describe('Today with a place', () => {
  beforeEach(() => {
    setPlace(makkah)
    setOnboarding({
      completed: true,
      gender: 'unspecified',
      completedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('shows the date and place, a window title, and a settings link', async () => {
    const { user, router } = await renderRoute('/')
    expect(await screen.findByText(/Makkah/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe('')
    await user.click(screen.getByRole('link', { name: strings.more.title }))
    expect(router.state.location.pathname).toBe('/settings')
  })

  it('marks a prayer done and takes the mark back', async () => {
    const { user } = await renderRoute('/')
    const asr = await screen.findByRole('checkbox', { name: strings.prayer.asr })
    expect(asr).toHaveAttribute('aria-checked', 'false')

    await user.click(asr)
    await waitFor(() => expect(asr).toHaveAttribute('aria-checked', 'true'))

    await user.click(asr)
    await waitFor(() => expect(asr).toHaveAttribute('aria-checked', 'false'))
  })

  it('offers one more item: adding it turns it on', async () => {
    const { user } = await renderRoute('/')
    await screen.findByText(strings.plan.tryOneMore)
    const offered = getSuggestion().itemId
    expect(offered).not.toBeNull()
    const before = getEnabledItems()
    expect(before).not.toContain(offered)

    await user.click(screen.getByRole('button', { name: strings.plan.add }))
    expect(getEnabledItems()).toContain(offered ?? '')
  })

  it('remembers an item the person is not ready for', async () => {
    const { user } = await renderRoute('/')
    await screen.findByText(strings.plan.tryOneMore)
    const offered = getSuggestion().itemId

    await user.click(screen.getByRole('button', { name: strings.plan.notNow }))
    expect(getSuggestion().dismissed).toContain(offered ?? '')
  })

  it('lets a qada prayer be made up from Today', async () => {
    setBacklog('fajr', 2)
    const { user } = await renderRoute('/')
    const row = await screen.findByText(strings.plan.outstanding(2))
    await user.click(row)
    await waitFor(() => expect(screen.getByText(strings.plan.outstanding(1))).toBeInTheDocument())
  })

  it('records not fasting today in Ramadan, and takes it back', async () => {
    const { user } = await renderRoute('/')
    await user.click(await screen.findByText(strings.fasting.notFastingToday))
    const recorded = await screen.findByText(strings.fasting.recordedToday)
    expect(
      within(recorded.parentElement ?? document.body).getByText(strings.fasting.undo),
    ).toBeInTheDocument()

    await user.click(recorded)
    expect(await screen.findByText(strings.fasting.notFastingToday)).toBeInTheDocument()
  })

  it('treats someone within three weeks of onboarding as new', async () => {
    setOnboarding({ completed: true, gender: 'unspecified', completedAt: new Date().toISOString() })
    await renderRoute('/')
    await screen.findByText(strings.plan.tryOneMore)
    // Fasting is too large an ask in the first weeks.
    expect(itemById(getSuggestion().itemId ?? '')?.category).not.toBe('fasting')
  })
})
