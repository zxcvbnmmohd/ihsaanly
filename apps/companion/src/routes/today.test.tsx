import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { getPlace } from '@ihsaanly/state/location/store'
import { getEnabledItems, setEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { getSuggestion } from '@ihsaanly/state/plan/suggestion-store'
import { getUserState, setUserState } from '@ihsaanly/state/plan/user-state-store'
import { setBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { allActions } from '@ihsaanly/state/storage/events'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

// Tuesday 2 March 2026, midday in London: inside Ramadan 1447, Fajr well past.
const RAMADAN_NOON = '2026-03-02T12:00:00Z'

beforeEach(async () => {
  setSystemTime(new Date(RAMADAN_NOON))
  await resetApp()
  await startUsing({ completedAt: '2026-03-01T00:00:00Z' })
})

afterEach(() => {
  setSystemTime()
})

const actionsOf = (kind: string): string[] =>
  allActions()
    .filter((action) => action.kind === kind)
    .map((action) => action.subject)

describe('without a place', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

  beforeEach(async () => {
    await resetApp()
    await startUsing({ place: null })
  })

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'geolocation', original)
    else Reflect.deleteProperty(navigator, 'geolocation')
  })

  function geolocation(
    run: (success: (position: unknown) => void, failure: (error: unknown) => void) => void,
  ): void {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: run },
    })
  }

  it('asks for a place, titled just "Today", with a way to choose a city', async () => {
    await renderApp('/today')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.today.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(
      (await screen.findAllByRole('link', { name: /Choose a city instead/ }))[0],
    ).toHaveAttribute('href', '/location')
  })

  it('uses the device location, then shows the prayers for it', async () => {
    geolocation((success) => success({ coords: { latitude: 51.5074, longitude: -0.1278 } }))
    const app = await renderApp('/today')
    await app.user.click(await screen.findByRole('button', { name: en.location.useDevice }))
    await waitFor(() => expect(getPlace()?.source).toBe('device'))
    expect(await screen.findByRole('checkbox', { name: en.prayer.fajr })).toBeInTheDocument()
  })

  it('says so when permission is declined', async () => {
    geolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }))
    const app = await renderApp('/today')
    await app.user.click(await screen.findByRole('button', { name: en.location.useDevice }))
    expect(await screen.findByText(en.location.declined)).toBeInTheDocument()
    expect(getPlace()).toBeNull()
  })

  it('says so when the position cannot be read', async () => {
    geolocation((success) =>
      success({
        get coords(): never {
          throw new Error('broken')
        },
      }),
    )
    const app = await renderApp('/today')
    await app.user.click(await screen.findByRole('button', { name: en.location.useDevice }))
    expect(await screen.findByText(en.location.unavailable)).toBeInTheDocument()
  })
})

describe('with a place', () => {
  it('is titled after the window it is in, with the five prayers', async () => {
    await renderApp('/today')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.window.sunrise }),
    ).toBeInTheDocument()
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(screen.getByRole('checkbox', { name: en.prayer[prayer] })).toBeInTheDocument()
    }
  })

  it('marks a prayer and takes the mark back', async () => {
    const app = await renderApp('/today')
    const fajr = await screen.findByRole('checkbox', { name: en.prayer.fajr })
    await app.user.click(fajr)
    expect(actionsOf('prayer-performed')).toEqual(['fajr'])
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: en.prayer.fajr })).toBeChecked(),
    )

    await app.user.click(screen.getByRole('checkbox', { name: en.prayer.fajr }))
    expect(actionsOf('prayer-unmarked')).toEqual(['fajr'])
  })

  it('hides the prayers while tracking is paused', async () => {
    setUserState({ ...getUserState(), trackingPaused: true })
    await renderApp('/today')
    await screen.findByRole('heading', { level: 2, name: en.plan.rightNow })
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('lists what is coming up and links each item', async () => {
    await renderApp('/today')
    expect((await screen.findAllByRole('link', { name: /Morning adhkar/ }))[0]).toHaveAttribute(
      'href',
      '/item/morning-adhkar',
    )
  })

  it('suggests one more item: Add puts it on Today', async () => {
    setEnabledItems(getEnabledItems().filter((id) => id !== 'duha-prayer'))
    const app = await renderApp('/today')
    await screen.findByText(en.plan.tryOneMore)
    await app.user.click(screen.getByRole('button', { name: en.plan.add }))
    expect(getEnabledItems()).toContain(getSuggestion().itemId as string)
  })

  it('or Not now dismisses it', async () => {
    const app = await renderApp('/today')
    await screen.findByText(en.plan.tryOneMore)
    await app.user.click(screen.getByRole('button', { name: en.plan.notNow }))
    expect(getSuggestion().dismissed).toHaveLength(1)
    await waitFor(() => expect(screen.queryByText(en.plan.tryOneMore)).toBeNull())
  })
})

describe('to make up', () => {
  it('shows what is owed and records one made up', async () => {
    setBacklog('fajr', 2)
    const app = await renderApp('/today')
    await screen.findByRole('heading', { level: 2, name: en.plan.makeUp })
    await app.user.click(await screen.findByRole('button', { name: /^Fajr/ }))
    expect(actionsOf('prayer-made-up')).toEqual(['fajr'])
  })

  it('notes a fast not kept in Ramadan, and undoes it', async () => {
    const app = await renderApp('/today')
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.fasting.notFastingToday}`) }),
    )
    expect(actionsOf('fast-owed')).toHaveLength(1)

    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(en.fasting.recordedToday) }),
    )
    expect(actionsOf('fast-owed-cleared')).toHaveLength(1)
  })

  it('offers no fast outside Ramadan', async () => {
    setSystemTime(new Date('2026-06-10T04:00:00Z'))
    await renderApp('/today')
    await screen.findByRole('heading', { level: 2, name: en.plan.prayers })
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${en.fasting.notFastingToday}`) }),
    ).toBeNull()
  })
})
