import { beforeEach, describe, expect, it } from 'bun:test'
import { items } from '@ihsaanly/core/content'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { screen } from '@testing-library/react'
import { fakeChrome } from '../../test/chrome'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/notifications', () => {
  it('reports the permission Chrome has granted', async () => {
    fakeChrome.permissionLevel = 'granted'
    await renderRoute('/notifications')
    expect(await screen.findByText(strings.notifications.permissionGranted)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.notifications.openSettings })).toBeNull()
  })

  it('sends a denied permission to Chrome settings', async () => {
    fakeChrome.permissionLevel = 'denied'
    const { user } = await renderRoute('/notifications')
    await user.click(
      await screen.findByRole('button', { name: strings.notifications.openSettings }),
    )
    expect(fakeChrome.tabsCreated).toEqual([{ url: 'chrome://settings/content/notifications' }])
  })

  it('says how far ahead reminders are set, from the latest plan alarm', async () => {
    const early = Date.parse('2026-10-05T12:00:00Z')
    const latest = Date.parse('2026-10-08T12:00:00Z')
    await fakeChrome.api.alarms.create('plan:a@1', { when: early })
    await fakeChrome.api.alarms.create('plan:b@2', { when: latest })
    await fakeChrome.api.alarms.create('later:c@3', { when: latest + 86_400_000 })
    await renderRoute('/notifications')

    const expected = strings.web.remindersThrough(
      new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'short' }).format(
        latest,
      ),
    )
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('says nothing about a horizon when no reminders are armed', async () => {
    await renderRoute('/notifications')
    await screen.findByText(strings.notifications.permissionGranted)
    expect(screen.queryByText(/Reminders are set through/)).toBeNull()
  })

  it('saves toggles, quiet hours and the daily cap', async () => {
    const { user } = await renderRoute('/notifications')
    const windows = await screen.findByRole('switch', { name: strings.notifications.windows })
    const before = getNotificationPreferences()
    await user.click(windows)
    expect(getNotificationPreferences().windows).toBe(!before.windows)

    await user.click(
      screen.getByRole('radio', { name: strings.notifications.quietHoursDetail(22, 7) }),
    )
    expect(getNotificationPreferences().quietHours).toEqual({ from: 22, to: 7 })

    await user.click(screen.getByRole('radio', { name: '5' }))
    expect(getNotificationPreferences().maxPerDay).toBe(5)
  })

  it('turns one item off without touching the rest', async () => {
    const { user } = await renderRoute('/notifications')
    await screen.findByText(strings.notifications.whichItems)
    const switches = screen.getAllByRole('switch')
    const first = switches[3]
    if (!first) throw new Error('no per-item switch')
    await user.click(first)
    expect(Object.values(getNotificationPreferences().perItem)).toEqual([false])
    expect(items.length).toBeGreaterThan(0)
  })

  it('shows a test notification straight away', async () => {
    const { user } = await renderRoute('/notifications')
    await user.click(await screen.findByText(strings.notifications.sendTest))
    expect(fakeChrome.notificationsShown).toHaveLength(1)
    const [shown] = fakeChrome.notificationsShown
    expect(shown?.id).toStartWith('test:')
    expect(shown?.options).toMatchObject({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: strings.notifications.testTitle,
      message: strings.notifications.testBody,
    })
  })
})
