import { beforeEach, describe, expect, it } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace } from '@ihsaanly/state/location/store'
import { screen, waitFor } from '@testing-library/react'
import { fakeChrome } from '../../test/chrome'
import { renderRoute, resetApp, strings } from '../../test/route'
import { BADGE_ALARM, BADGE_KEY, DONE_QUEUE_KEY } from '../alarms'

beforeEach(resetApp)

const makkah: Place = {
  label: 'Makkah, Saudi Arabia',
  latitude: 21.4225,
  longitude: 39.8262,
  timeZone: 'Asia/Riyadh',
  source: 'city',
}

describe('popup shell', () => {
  it('sends a link to a page that lives in the full app back to Today', async () => {
    const { user, router } = await renderRoute('/library')
    expect(await screen.findByText(strings.notFound.body)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: strings.tabs.today }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('keeps the badge and reminders going whatever route is open', async () => {
    setPlace(makkah)
    await renderRoute('/appearance')
    await waitFor(() => expect(fakeChrome.alarmList.has(BADGE_ALARM)).toBe(true))
    expect(fakeChrome.local.data.get(BADGE_KEY)).toHaveLength(20)
    await waitFor(() => expect(fakeChrome.alarmList.size).toBeGreaterThan(1))
    expect([...fakeChrome.alarmList.keys()].some((name) => name.startsWith('plan:'))).toBe(true)
  })

  it('records the Done pressed on a notification when the popup opens', async () => {
    setPlace(makkah)
    await fakeChrome.local.set({ [DONE_QUEUE_KEY]: [{ itemId: 'morning-adhkar', at: Date.now() }] })
    await renderRoute('/appearance')
    await waitFor(() => expect(fakeChrome.local.data.has(DONE_QUEUE_KEY)).toBe(false))
  })

  it('clears the badge with no place', async () => {
    await renderRoute('/appearance')
    await waitFor(() => expect(fakeChrome.badgeText).toEqual(['']))
  })
})
