// The popup's half of reminders and the badge: the app state lives here, so
// this is where the plan becomes alarms (./alarms), prayer times become the
// badge's list (./badge), and a "Done" pressed on a notification is recorded.
// background.ts is the other half.
import { items } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import type { Plan } from '@ihsaanly/core/plan/signals'
import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import { PRAYERS } from '@ihsaanly/core/prayer/qada'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import type { Strings } from '@ihsaanly/core/strings/en'
import {
  type NotificationContent,
  notificationContent,
} from '@ihsaanly/state/notifications/content'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { getStrings } from '@ihsaanly/state/strings'
import { useEffect } from 'react'
import { BADGE_ALARM, BADGE_KEY, DONE_QUEUE_KEY, type QueuedDone, syncReminders } from './alarms'
import { type BadgePrayer, badgeFor } from './badge'

function contentsFor(plan: Plan): NotificationContent[] {
  const strings = getStrings()
  return plan.notifications.flatMap((entry) => notificationContent(entry, items, strings) ?? [])
}

/**
 * Keyed on the schedule's identifiers, not the plan object, which is rebuilt
 * every minute (same reasoning as mobile's `scheduleKey`).
 *
 * ponytail: runs only while the popup is open; the plan's look-ahead keeps
 * reminders going for days. If that proves short, re-plan from an offscreen
 * document on a daily alarm.
 */
export function useReminderSync(plan: Plan | null): void {
  const contents = plan ? contentsFor(plan) : null
  const key = contents?.map((content) => content.identifier).join('|') ?? ''

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` fingerprints the whole schedule.
  useEffect(() => {
    if (contents) void syncReminders(contents, getStrings(), chrome)
  }, [key])
}

/** The five prayers' starts from yesterday to the day after tomorrow, named. */
function badgePrayers(
  place: Place,
  preferences: CalculationPreferences,
  strings: Strings,
): BadgePrayer[] {
  return prayerTimesAcross(place, new Date(), preferences, 4)
    .flatMap((day) => PRAYERS.map((prayer) => ({ name: strings.prayer[prayer], at: day[prayer] })))
    .map((prayer) => ({ name: prayer.name, at: prayer.at.getTime() }))
    .sort((a, b) => a.at - b.at)
}

/**
 * Hands the worker the prayer times and a once-a-minute alarm to count down
 * with, and sets the badge straight away so it never lags the popup.
 *
 * ponytail: the list runs out two days after the popup was last opened, and
 * the badge then goes blank rather than wrong.
 */
export function useBadge(
  place: Place | null,
  preferences: CalculationPreferences,
  strings: Strings,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the inputs change, not the object identities.
  useEffect(() => {
    if (!place) {
      void chrome.action.setBadgeText({ text: '' })
      return
    }
    const prayers = badgePrayers(place, preferences, strings)
    const badge = badgeFor(prayers, Date.now(), navigator.language)
    void chrome.storage.local.set({ [BADGE_KEY]: prayers })
    void chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 1 })
    void chrome.action.setBadgeText({ text: badge?.text ?? '' })
  }, [JSON.stringify(place), JSON.stringify(preferences), strings])
}

/** Records the "Done"s pressed on notifications since the popup last opened. */
export function useQueuedDones(timeZone: string | null): void {
  useEffect(() => {
    if (!timeZone) return
    void chrome.storage.local.get(DONE_QUEUE_KEY).then(async (stored) => {
      const queue = (stored[DONE_QUEUE_KEY] ?? []) as QueuedDone[]
      if (queue.length === 0) return
      await chrome.storage.local.remove(DONE_QUEUE_KEY)
      for (const done of queue) completeItem(done.itemId, new Date(done.at), timeZone)
    })
  }, [timeZone])
}
