// The extension's service worker. It never reads app state (that lives in the
// popup's localStorage, which a worker cannot reach): the popup has already
// turned the plan into alarms, words and prayer times (src/reminders.ts), so
// this only shows them, and queues a "Done" for the popup to record.
import { LATER_DELAY_MS } from '@ihsaanly/state/notifications/payload'
import { brand } from '@ihsaanly/tailwind/tokens'

import {
  BADGE_ALARM,
  BADGE_KEY,
  DONE_QUEUE_KEY,
  OPEN_ROUTE_KEY,
  type QueuedDone,
  type Reminder,
} from './alarms'
import { type BadgePrayer, badgeFor } from './badge'

async function refreshBadge(): Promise<void> {
  const stored = await chrome.storage.local.get(BADGE_KEY)
  const prayers = (stored[BADGE_KEY] ?? []) as BadgePrayer[]
  const badge = badgeFor(prayers, Date.now(), chrome.i18n.getUILanguage())
  await chrome.action.setBadgeText({ text: badge?.text ?? '' })
  await chrome.action.setTitle({ title: badge ? `Ihsaanly · ${badge.title}` : 'Ihsaanly' })
}

async function show(name: string): Promise<void> {
  const stored = await chrome.storage.local.get(name)
  const reminder = stored[name] as Reminder | undefined
  if (!reminder) return
  await chrome.storage.local.remove(name)
  // Kept for the session so a click or a button can still act on it.
  await chrome.storage.session.set({ [name]: reminder })
  chrome.notifications.create(name, {
    type: 'basic',
    iconUrl: 'icon-128.png',
    title: reminder.title,
    message: reminder.body,
    buttons: reminder.itemId
      ? [{ title: reminder.actions.done }, { title: reminder.actions.later }]
      : undefined,
  })
}

async function reminderOf(id: string): Promise<Reminder | undefined> {
  const stored = await chrome.storage.session.get(id)
  return stored[id] as Reminder | undefined
}

/** The popup itself where Chrome allows it (127+, a focused window), else a tab. */
async function open(route: string): Promise<void> {
  await chrome.storage.session.set({ [OPEN_ROUTE_KEY]: route })
  try {
    await chrome.action.openPopup()
  } catch {
    await chrome.storage.session.remove(OPEN_ROUTE_KEY)
    await chrome.tabs.create({ url: chrome.runtime.getURL(`popup.html?tab#${route}`) })
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.setBadgeBackgroundColor({ color: brand.accent.light })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  void (alarm.name === BADGE_ALARM ? refreshBadge() : show(alarm.name))
})

chrome.notifications.onClicked.addListener(async (id) => {
  const reminder = await reminderOf(id)
  chrome.notifications.clear(id)
  await open(reminder?.itemId ? `/item/${reminder.itemId}` : '/')
})

chrome.notifications.onButtonClicked.addListener(async (id, index) => {
  const reminder = await reminderOf(id)
  chrome.notifications.clear(id)
  if (!reminder?.itemId) return

  if (index === 0) {
    const stored = await chrome.storage.local.get(DONE_QUEUE_KEY)
    const queue = (stored[DONE_QUEUE_KEY] ?? []) as QueuedDone[]
    const done: QueuedDone = { itemId: reminder.itemId, at: Date.now() }
    await chrome.storage.local.set({ [DONE_QUEUE_KEY]: [...queue, done] })
    return
  }

  // Later: the same words again, unless the window will have closed by then.
  const at = Date.now() + LATER_DELAY_MS
  if (reminder.endsAt !== null && at >= reminder.endsAt) return
  const name = `later:${reminder.itemId}@${at}`
  await chrome.storage.local.set({ [name]: reminder })
  await chrome.alarms.create(name, { when: at })
})
