import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { getUserState, setUserState } from '@ihsaanly/state/plan/user-state-store'
import { getItemProgress } from '@ihsaanly/state/progress/store'
import { getTodayHints, setTourSeen } from '@ihsaanly/state/today/hints'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

// Tuesday 2 March 2026 in London: at midday the morning adhkar are still open;
// half an hour on, Dhuhr is near and its sunnah before it is due.
const NOON = '2026-03-02T12:00:00Z'
const AFTERNOON = '2026-03-02T12:30:00Z'

beforeEach(async () => {
  setSystemTime(new Date(NOON))
  await resetApp()
  await startUsing({ completedAt: '2026-03-01T00:00:00Z' })
  setTourSeen()
})

afterEach(() => {
  setSystemTime()
})

const BEFORE_DHUHR = 'Two or four rak’ah before Dhuhr'

describe('marking a single item', () => {
  beforeEach(() => setSystemTime(new Date(AFTERNOON)))

  it('moves it to Done today with an undo bar, and Undo brings it back', async () => {
    const app = await renderApp('/today')
    await app.user.click(
      await screen.findByRole('button', { name: en.today.markDone(BEFORE_DHUHR) }),
    )

    const bar = await screen.findByRole('button', { name: en.today.undoItem(BEFORE_DHUHR) })
    expect(screen.queryByRole('button', { name: en.today.markDone(BEFORE_DHUHR) })).toBeNull()
    expect(screen.getByRole('button', { name: en.today.doneToday(1) })).toBeInTheDocument()

    await app.user.click(bar)
    expect(
      await screen.findByRole('button', { name: en.today.markDone(BEFORE_DHUHR) }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.today.undoItem(BEFORE_DHUHR) })).toBeNull()
  })

  it('unmarks from Done today', async () => {
    const app = await renderApp('/today')
    await app.user.click(
      await screen.findByRole('button', { name: en.today.markDone(BEFORE_DHUHR) }),
    )
    await app.user.click(await screen.findByRole('button', { name: en.today.doneToday(1) }))
    await app.user.click(await screen.findByRole('button', { name: en.today.unmark(BEFORE_DHUHR) }))
    expect(
      await screen.findByRole('button', { name: en.today.markDone(BEFORE_DHUHR) }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.today.undoItem(BEFORE_DHUHR) })).toBeNull()
  })

  it('opens the item from the card body, not the circle', async () => {
    setSystemTime(new Date(NOON))
    const app = await renderApp('/today')
    await app.user.click(
      (await screen.findAllByRole('link', { name: /Morning adhkar/ }))[0] as HTMLElement,
    )
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/item/morning-adhkar'))
  })
})

describe('the count panel', () => {
  beforeEach(() => setSystemTime(new Date(AFTERNOON)))

  const open = async (app: Awaited<ReturnType<typeof renderApp>>): Promise<HTMLElement> => {
    await app.user.click(
      await screen.findByRole('button', { name: en.today.countItem('Tasbih after prayer', 0, 33) }),
    )
    return screen.findByRole('dialog', { name: 'Tasbih after prayer' })
  }

  it('counts to the target, completes the item and shows the undo bar', async () => {
    const app = await renderApp('/today')
    const dialog = await open(app)
    for (let count = 0; count < 33; count += 1) {
      await app.user.click(
        within(dialog).getByRole('button', {
          name: en.today.countItem('Tasbih after prayer', count, 33),
        }),
      )
    }
    expect(
      await screen.findByRole('button', { name: en.today.undoItem('Tasbih after prayer') }),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('marks all done from the panel', async () => {
    const app = await renderApp('/today')
    const dialog = await open(app)
    await app.user.click(within(dialog).getByRole('button', { name: en.panel.markAll }))
    expect(
      await screen.findByRole('button', { name: en.today.undoItem('Tasbih after prayer') }),
    ).toBeInTheDocument()
  })

  it('closes without counting', async () => {
    const app = await renderApp('/today')
    const dialog = await open(app)
    await app.user.click(within(dialog).getByRole('button', { name: en.panel.close }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(getItemProgress('tasbih-after-prayer').count).toBe(0)
  })
})

describe('the parts panel', () => {
  const open = async (app: Awaited<ReturnType<typeof renderApp>>): Promise<HTMLElement> => {
    await app.user.click(
      await screen.findByRole('button', { name: en.today.partsItem('Morning adhkar', 0, 10) }),
    )
    return screen.findByRole('dialog', { name: 'Morning adhkar' })
  }

  it('toggles a part on and off, then marks all done', async () => {
    const app = await renderApp('/today')
    const dialog = await open(app)
    const [first] = within(dialog).getAllByRole('checkbox')
    await app.user.click(first as HTMLElement)
    await waitFor(() => expect(getItemProgress('morning-adhkar').parts).toHaveLength(1))
    await app.user.click(first as HTMLElement)
    await waitFor(() => expect(getItemProgress('morning-adhkar').parts).toHaveLength(0))

    await app.user.click(within(dialog).getByRole('button', { name: en.panel.markAll }))
    expect(
      await screen.findByRole('button', { name: en.today.undoItem('Morning adhkar') }),
    ).toBeInTheDocument()
  })

  it('finishes the item when the last part is ticked', async () => {
    const app = await renderApp('/today')
    const dialog = await open(app)
    for (const box of within(dialog).getAllByRole('checkbox')) {
      await app.user.click(box)
    }
    expect(
      await screen.findByRole('button', { name: en.today.undoItem('Morning adhkar') }),
    ).toBeInTheDocument()
  })
})

describe('the prayer hint', () => {
  it('shows until a third prayer has been marked', async () => {
    const app = await renderApp('/today')
    expect(await screen.findByText(en.today.prayerHint)).toBeInTheDocument()
    for (const prayer of ['fajr', 'dhuhr', 'asr'] as const) {
      await app.user.click(await screen.findByRole('checkbox', { name: en.prayer[prayer] }))
    }
    await waitFor(() => expect(screen.queryByText(en.today.prayerHint)).toBeNull())
    expect(getTodayHints().prayersMarked).toBe(3)
  })
})

describe('the tour', () => {
  beforeEach(async () => {
    await resetApp()
    await startUsing({ completedAt: '2026-03-01T00:00:00Z' })
  })

  it('shows once after onboarding, and Skip ends it for good', async () => {
    const app = await renderApp('/today')
    expect(await screen.findByText(en.tour.prayer)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.tour.skip }))
    await waitFor(() => expect(screen.queryByText(en.tour.prayer)).toBeNull())
    expect(getTodayHints().tourSeen).toBe(true)
  })

  it('moves on when a prayer is marked, and on with Next to the end', async () => {
    const app = await renderApp('/today')
    await screen.findByText(en.tour.prayer)
    await app.user.click(await screen.findByRole('checkbox', { name: en.prayer.fajr }))
    expect(await screen.findByText(en.tour.sunnah)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.tour.next }))
    expect(await screen.findByText(en.tour.card)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.tour.done }))
    await waitFor(() => expect(screen.queryByText(en.tour.card)).toBeNull())
  })

  it('replays from More with ?tour=1, then drops the param', async () => {
    setTourSeen()
    const app = await renderApp('/today?tour=1')
    expect(await screen.findByText(en.tour.prayer)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.tour.skip }))
    await waitFor(() => expect(app.router.state.location.search).toEqual({}))
    expect(screen.queryByText(en.tour.prayer)).toBeNull()
  })

  it('"Show me around" in More lands on Today with the tour', async () => {
    setTourSeen()
    const app = await renderApp('/more')
    const [link] = await screen.findAllByRole('link', { name: new RegExp(en.more.showMeAround) })
    expect(link).toHaveAttribute('href', '/today?tour=1')
    await app.user.click(link as HTMLElement)
    expect(await screen.findByText(en.tour.prayer)).toBeInTheDocument()
  })
})

describe('while paused', () => {
  it('shows the notice, hides the prayers and the hint', async () => {
    setUserState({ ...getUserState(), trackingPaused: true })
    await renderApp('/today')
    expect(await screen.findByText(en.today.paused)).toBeInTheDocument()
    expect(screen.queryByText(en.today.prayerHint)).toBeNull()
    expect(screen.queryByRole('checkbox', { name: en.prayer.fajr })).toBeNull()
    expect(screen.queryByText(new RegExp(`^${en.fasting.notFastingToday}`))).toBeNull()
  })

  it('asks to resume on the check-in day: Not yet snoozes, Resume resumes', async () => {
    setUserState({ ...getUserState(), trackingPaused: true, pauseCheckInOn: '2026-03-02' })
    const app = await renderApp('/today')
    expect(await screen.findByText(en.today.checkInTitle)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.today.notYet }))
    expect(getUserState().pauseCheckInOn).toBe('2026-03-03')
    await waitFor(() => expect(screen.queryByText(en.today.checkInTitle)).toBeNull())

    setUserState({ ...getUserState(), pauseCheckInOn: '2026-03-02' })
    await app.user.click(await screen.findByRole('button', { name: en.today.resume }))
    expect(getUserState().trackingPaused).toBe(false)
    expect(await screen.findByRole('checkbox', { name: en.prayer.fajr })).toBeInTheDocument()
  })
})
