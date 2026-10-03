import { beforeEach, describe, expect, it } from 'bun:test'
import { LATER_DELAY_MS } from '@ihsaanly/state/notifications/payload'
import { brand } from '@ihsaanly/tailwind/tokens'
import { fakeChrome } from '../test/chrome'
import { BADGE_ALARM, BADGE_KEY, DONE_QUEUE_KEY, OPEN_ROUTE_KEY, type Reminder } from './alarms'

// Importing the worker registers its listeners on the fake.
await import('./background')

const actions = { done: 'Done', later: 'Later' }
const itemReminder: Reminder = {
  title: 'Evening adhkar',
  body: 'Open until Maghrib',
  itemId: 'evening-adhkar',
  endsAt: null,
  actions,
}

beforeEach(() => fakeChrome.reset())

/** Puts a reminder where the alarm handler finds it, as syncReminders does. */
async function arm(name: string, reminder: Reminder): Promise<void> {
  await fakeChrome.local.set({ [name]: reminder })
}

describe('service worker', () => {
  it('colours the badge when installed', async () => {
    await fakeChrome.installed.fire()
    expect(fakeChrome.badgeColors).toEqual([brand.accent.light])
  })

  describe('alarms', () => {
    it('shows a due reminder with Done and Later, and keeps it for the session', async () => {
      await arm('plan:a@1', itemReminder)
      await fakeChrome.alarmEvents.fire({ name: 'plan:a@1' })
      // The handler does not return its work; let the storage writes settle.
      await Bun.sleep(0)

      expect(fakeChrome.notificationsShown).toEqual([
        {
          id: 'plan:a@1',
          options: {
            type: 'basic',
            iconUrl: 'icon-128.png',
            title: 'Evening adhkar',
            message: 'Open until Maghrib',
            buttons: [{ title: 'Done' }, { title: 'Later' }],
          },
        },
      ])
      expect(fakeChrome.local.data.has('plan:a@1')).toBe(false)
      expect(fakeChrome.session.data.get('plan:a@1')).toEqual(itemReminder)
    })

    it('shows a reminder with no item without buttons', async () => {
      await arm('plan:b@1', { ...itemReminder, itemId: null })
      await fakeChrome.alarmEvents.fire({ name: 'plan:b@1' })
      await Bun.sleep(0)
      expect(fakeChrome.notificationsShown[0]?.options.buttons).toBeUndefined()
    })

    it('ignores an alarm whose reminder is gone', async () => {
      await fakeChrome.alarmEvents.fire({ name: 'plan:gone@1' })
      await Bun.sleep(0)
      expect(fakeChrome.notificationsShown).toEqual([])
    })

    it('refreshes the badge on its own alarm', async () => {
      const at = Date.now() + 30 * 60_000
      await fakeChrome.local.set({ [BADGE_KEY]: [{ name: 'Asr', at }] })
      await fakeChrome.alarmEvents.fire({ name: BADGE_ALARM })
      await Bun.sleep(0)
      expect(fakeChrome.badgeText).toEqual(['30m'])
      expect(fakeChrome.badgeTitle[0]).toStartWith('Ihsaanly · Asr · ')
    })

    it('clears the badge once the prayers run out', async () => {
      await fakeChrome.alarmEvents.fire({ name: BADGE_ALARM })
      await Bun.sleep(0)
      expect(fakeChrome.badgeText).toEqual([''])
      expect(fakeChrome.badgeTitle).toEqual(['Ihsaanly'])
    })
  })

  describe('clicking a notification', () => {
    it('opens the popup on the item', async () => {
      await fakeChrome.session.set({ n1: itemReminder })
      await fakeChrome.clicked.fire('n1')
      expect(fakeChrome.notificationsCleared).toEqual(['n1'])
      expect(fakeChrome.session.data.get(OPEN_ROUTE_KEY)).toBe('/item/evening-adhkar')
      expect(fakeChrome.popupOpens).toBe(1)
    })

    it('opens Today when the reminder has no item (or is unknown)', async () => {
      await fakeChrome.clicked.fire('unknown')
      expect(fakeChrome.session.data.get(OPEN_ROUTE_KEY)).toBe('/')
    })

    it('falls back to a tab when the popup cannot open', async () => {
      fakeChrome.popupError = new Error('no focused window')
      await fakeChrome.session.set({ n1: itemReminder })
      await fakeChrome.clicked.fire('n1')
      expect(fakeChrome.session.data.has(OPEN_ROUTE_KEY)).toBe(false)
      expect(fakeChrome.tabsCreated).toEqual([
        { url: 'chrome-extension://fake-id/popup.html?tab#/item/evening-adhkar' },
      ])
    })
  })

  describe('pressing a notification button', () => {
    it('queues Done for the popup to record', async () => {
      await fakeChrome.session.set({ n1: itemReminder })
      await fakeChrome.local.set({ [DONE_QUEUE_KEY]: [{ itemId: 'earlier', at: 1 }] })
      const before = Date.now()
      await fakeChrome.buttonClicked.fire('n1', 0)

      expect(fakeChrome.notificationsCleared).toEqual(['n1'])
      const queue = fakeChrome.local.data.get(DONE_QUEUE_KEY) as { itemId: string; at: number }[]
      expect(queue.map((done) => done.itemId)).toEqual(['earlier', 'evening-adhkar'])
      expect(queue[1]?.at).toBeGreaterThanOrEqual(before)
    })

    it('starts a queue when none exists', async () => {
      await fakeChrome.session.set({ n1: itemReminder })
      await fakeChrome.buttonClicked.fire('n1', 0)
      expect(fakeChrome.local.data.get(DONE_QUEUE_KEY)).toHaveLength(1)
    })

    it('snoozes with Later: the same reminder again after the delay', async () => {
      await fakeChrome.session.set({ n1: itemReminder })
      const before = Date.now()
      await fakeChrome.buttonClicked.fire('n1', 1)

      const [alarm] = [...fakeChrome.alarmList.values()]
      expect(alarm?.name).toMatch(/^later:evening-adhkar@\d+$/)
      expect(alarm?.scheduledTime).toBeGreaterThanOrEqual(before + LATER_DELAY_MS)
      expect(fakeChrome.local.data.get(alarm?.name ?? '')).toEqual(itemReminder)
    })

    it('does not snooze past the end of the window', async () => {
      await fakeChrome.session.set({ n1: { ...itemReminder, endsAt: Date.now() + 1000 } })
      await fakeChrome.buttonClicked.fire('n1', 1)
      expect(fakeChrome.alarmList.size).toBe(0)
    })

    it('does nothing for a reminder with no item', async () => {
      await fakeChrome.session.set({ n1: { ...itemReminder, itemId: null } })
      await fakeChrome.buttonClicked.fire('n1', 0)
      expect(fakeChrome.notificationsCleared).toEqual(['n1'])
      expect(fakeChrome.local.data.size).toBe(0)
    })
  })
})
