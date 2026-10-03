import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { getPlace, setPlace } from '@ihsaanly/state/location/store'
import { setOnboarding } from '@ihsaanly/state/onboarding/store'
import { getEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { getSuggestion } from '@ihsaanly/state/plan/suggestion-store'
import { pauseTracking } from '@ihsaanly/state/plan/user-state-store'
import { setBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { startProgress } from '@ihsaanly/state/progress/configure'
import { getTodayHints, setTourSeen } from '@ihsaanly/state/today/hints'
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

let stopProgress = (): void => {}
beforeEach(() => {
  resetApp()
  setSystemTime(RAMADAN)
  stopProgress = startProgress()
})
afterEach(() => {
  stopProgress()
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

describe('Today sunnah marking', () => {
  const MARK = /^Mark .* done$/
  beforeEach(() => {
    setPlace(makkah)
    setOnboarding({
      completed: true,
      gender: 'unspecified',
      completedAt: '2026-01-01T00:00:00.000Z',
    })
    setTourSeen()
  })

  it('ticks a sunnah done, with Undo to take it back', async () => {
    const { user } = await renderRoute('/')
    const circle = (await screen.findAllByRole('button', { name: MARK }))[0]
    const label = circle?.getAttribute('aria-label') ?? ''
    const title = label.replace(/^Mark /, '').replace(/ done$/, '')

    await user.click(circle as HTMLElement)
    expect(await screen.findByRole('status')).toHaveTextContent(strings.today.markedDone)
    expect(screen.queryByRole('button', { name: label })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.today.doneToday(1) }))
    expect(screen.getByRole('button', { name: strings.today.unmark(title) })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: strings.today.undoItem(title) }))
    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument()
    expect(screen.queryByText(strings.today.markedDone)).toBeNull()
  })

  it('unmarks a done sunnah from its circle', async () => {
    const { user } = await renderRoute('/')
    const circle = (await screen.findAllByRole('button', { name: MARK }))[0]
    const label = circle?.getAttribute('aria-label') ?? ''
    const title = label.replace(/^Mark /, '').replace(/ done$/, '')
    await user.click(circle as HTMLElement)
    await user.click(await screen.findByRole('button', { name: strings.today.doneToday(1) }))
    await user.click(await screen.findByRole('button', { name: strings.today.unmark(title) }))
    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument()
    expect(screen.queryByText(strings.today.markedDone)).toBeNull()
  })

  it('counts a repeated item in its panel until it is done', async () => {
    const { user } = await renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /^Count Tasbih after prayer/ }))
    for (let count = 0; count < 33; count++) {
      const buttons = screen.getAllByRole('button', { name: /^Count Tasbih after prayer/ })
      await user.click(buttons[buttons.length - 1] as HTMLElement)
    }
    expect(await screen.findByRole('status')).toHaveTextContent(strings.today.markedDone)
    expect(screen.queryByRole('button', { name: strings.panel.markAll })).toBeNull()
    // 33 taps, each a full render: near the 5 s default on a CI runner.
  }, 20_000)

  it('marks a counted item all done from its panel, or closes the panel', async () => {
    const { user } = await renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /^Count Tasbih after prayer/ }))
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(screen.queryByRole('button', { name: strings.panel.markAll })).toBeNull()

    await user.click(await screen.findByRole('button', { name: /^Count Tasbih after prayer/ }))
    await user.click(screen.getByRole('button', { name: strings.panel.markAll }))
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.panel.markAll })).toBeNull()
  })

  it('ticks off the parts of an item in its checklist until it is done', async () => {
    const { user } = await renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /^Parts of Morning adhkar/ }))
    const prayers = new Set(Object.values(strings.prayer).filter((x) => typeof x === 'string'))
    const parts = screen
      .getAllByRole('checkbox')
      .map((box) => box.getAttribute('aria-label') ?? '')
      .filter((name) => !prayers.has(name))
    expect(parts.length).toBe(10)
    for (const name of parts) await user.click(screen.getByRole('checkbox', { name }))
    expect(await screen.findByRole('status')).toHaveTextContent(strings.today.markedDone)
  })

  it('shows the prayer hint until three prayers are marked', async () => {
    const { user } = await renderRoute('/')
    expect(await screen.findByText(strings.today.prayerHint)).toBeInTheDocument()
    for (const prayer of [strings.prayer.fajr, strings.prayer.dhuhr, strings.prayer.asr]) {
      await user.click(screen.getByRole('checkbox', { name: prayer }))
    }
    await waitFor(() => expect(screen.queryByText(strings.today.prayerHint)).toBeNull())
    expect(getTodayHints().prayersMarked).toBe(3)
  })

  it('does not count a prayer that is unmarked', async () => {
    const { user } = await renderRoute('/')
    const asr = await screen.findByRole('checkbox', { name: strings.prayer.asr })
    await user.click(asr)
    await user.click(asr)
    expect(getTodayHints().prayersMarked).toBe(1)
  })
})

describe('Today first-run tour', () => {
  beforeEach(() => {
    setPlace(makkah)
    setOnboarding({
      completed: true,
      gender: 'unspecified',
      completedAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('shows once after onboarding, moves on when a prayer is marked, and ends at the last step', async () => {
    const { user } = await renderRoute('/')
    const tip = await screen.findByRole('dialog', { name: strings.tour.step(1, 3) })
    expect(tip).toHaveTextContent(strings.tour.prayer)

    await user.click(screen.getByRole('checkbox', { name: strings.prayer.asr }))
    expect(await screen.findByRole('dialog', { name: strings.tour.step(2, 3) })).toHaveTextContent(
      strings.tour.sunnah,
    )
    await user.click(screen.getByRole('button', { name: strings.tour.next }))
    expect(await screen.findByRole('dialog', { name: strings.tour.step(3, 3) })).toHaveTextContent(
      strings.tour.card,
    )
    await user.click(screen.getByRole('button', { name: strings.tour.done }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(getTodayHints().tourSeen).toBe(true)
  })

  it('can be skipped, and is then not shown again', async () => {
    const { user } = await renderRoute('/')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: strings.tour.skip }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(getTodayHints().tourSeen).toBe(true)
  })

  it('replays from ?tour=1 and drops the parameter when it ends', async () => {
    setTourSeen()
    const { user, router } = await renderRoute('/?tour=1')
    await screen.findByRole('dialog', { name: strings.tour.step(1, 3) })
    await user.click(screen.getByRole('button', { name: strings.tour.skip }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toEqual({})
  })

  it('is what More → Show me around lands on, through /today', async () => {
    setTourSeen()
    const { router } = await renderRoute('/today?tour=1')
    await screen.findByRole('dialog', { name: strings.tour.step(1, 3) })
    expect(router.state.location.pathname).toBe('/')
  })

  it('has /today alone land on Today without the tour', async () => {
    setTourSeen()
    const { router } = await renderRoute('/today')
    await screen.findByRole('checkbox', { name: strings.prayer.asr })
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is linked from the settings list', async () => {
    setTourSeen()
    const { user, router } = await renderRoute('/settings')
    const links = await screen.findAllByRole('link', { name: strings.more.showMeAround })
    await user.click(links[0] as HTMLElement)
    await screen.findByRole('dialog', { name: strings.tour.step(1, 3) })
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('Today while tracking is paused', () => {
  beforeEach(() => {
    setPlace(makkah)
    setOnboarding({
      completed: true,
      gender: 'unspecified',
      completedAt: '2026-01-01T00:00:00.000Z',
    })
    setTourSeen()
    pauseTracking({ checkInDays: 3 }, RAMADAN)
  })

  it('shows the paused notice instead of the prayer strip, with no check-in yet', async () => {
    await renderRoute('/')
    expect(await screen.findByText(strings.today.paused)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: strings.prayer.asr })).toBeNull()
    expect(screen.queryByText(strings.today.prayerHint)).toBeNull()
    expect(screen.queryByText(strings.today.checkInTitle)).toBeNull()
  })

  it('asks to resume once the check-in is due, and Resume brings the strip back', async () => {
    setSystemTime(new Date(RAMADAN.getTime() + 5 * 86_400_000))
    const { user } = await renderRoute('/')
    expect(await screen.findByText(strings.today.checkInTitle)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.today.resume }))
    expect(await screen.findByRole('checkbox', { name: strings.prayer.asr })).toBeInTheDocument()
  })

  it('Not yet snoozes the check-in', async () => {
    setSystemTime(new Date(RAMADAN.getTime() + 5 * 86_400_000))
    const { user } = await renderRoute('/')
    await user.click(await screen.findByRole('button', { name: strings.today.notYet }))
    await waitFor(() => expect(screen.queryByText(strings.today.checkInTitle)).toBeNull())
    expect(screen.getByText(strings.today.paused)).toBeInTheDocument()
  })
})
