// What onboarding shows of the app before it is set up, built from the same
// planner, content and notification words the app itself uses, so the
// previews are the real thing rather than a mock-up.
import { resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import type { Place } from '@ihsaanly/core/location/place'
import { prayerName, windowName } from '@ihsaanly/core/plan/jumuah'
import type { Plan, ScheduledNotification } from '@ihsaanly/core/plan/signals'
import type { Strings } from '@ihsaanly/core/strings/en'
import { distanceLabel } from '@ihsaanly/ui/props/today'
import type {
  NotificationPreview,
  ReminderPreview,
  SourcedExample,
  WidgetPreview,
} from '@ihsaanly/ui/screens/onboarding'
import { notificationContent } from '../notifications/content'

/**
 * Where the previews are worked out until a place is chosen: they show a rough
 * distance and never a clock time, so any real place reads true enough.
 */
export const PREVIEW_PLACE: Place = {
  label: 'Makkah, Saudi Arabia',
  latitude: 21.4225,
  longitude: 39.8262,
  timeZone: 'Asia/Riyadh',
  source: 'city',
}

/** The item "Every sunnah, sourced" walks through; graded by a named grader. */
export const SOURCED_ITEM = 'dua-leaving-home'

/** An item the previews fall back on when the plan has nothing to say. */
const FALLBACK_ITEM = 'morning-adhkar'

/**
 * One real item, as the sourced step lays it out: its reminder line, its
 * first hadith (collection, number, grading and grader), and its `why`. Falls
 * back to the first item citing a hadith if content no longer has the usual one.
 */
export function sourcedExample(items: Item[]): SourcedExample | null {
  const cites = (item: Item): boolean => item.evidence.some((entry) => entry.type === 'hadith')
  const item =
    items.find((candidate) => candidate.id === SOURCED_ITEM && cites(candidate)) ??
    items.find(cites)
  const evidence = item?.evidence.find((entry) => entry.type === 'hadith')
  if (!item || !evidence) return null
  return {
    title: resolveText(item.title) ?? item.id,
    reminder: resolveText(item.reminder),
    evidence,
    why: resolveText(item.why),
  }
}

function words(
  entry: ScheduledNotification,
  items: Item[],
  strings: Strings,
): NotificationPreview | null {
  const content = notificationContent(entry, items, strings)
  return content ? { title: content.title, body: content.body } : null
}

/**
 * A reminder and a prayer notification from the person's own plan: the next
 * item reminder inside a window (the look-ahead only when there is none), and
 * the next prayer's "Have you prayed?". `plan` is planned with every reminder
 * on, so the preview shows what turning them on would bring.
 */
export function reminderPreview(
  plan: Plan,
  items: Item[],
  strings: Strings,
  now: Date,
): ReminderPreview {
  const itemEntries = plan.notifications.filter((entry) => entry.kind === 'item')
  const itemEntry = itemEntries.find((entry) => entry.reason !== 'upcoming') ??
    itemEntries[0] ?? {
      kind: 'item',
      itemId: plan.today.rightNow?.itemId ?? FALLBACK_ITEM,
      at: now,
      reason: 'current-window',
      window: null,
    }
  const next = plan.today.next
  const prayerEntry = plan.notifications.find((entry) => entry.kind === 'prayer') ?? {
    kind: 'prayer',
    prayer: next?.prayer ?? 'asr',
    jumuah: next?.jumuah ?? false,
    at: next?.startsAt ?? now,
    endsAt: next?.startsAt ?? now,
  }

  return {
    item: words(itemEntry, items, strings) ?? {
      title: strings.notifications.testTitle,
      body: strings.notifications.testBody,
    },
    // A prayer entry always has words; the fallback only satisfies the type.
    prayer: words(prayerEntry, items, strings) ?? {
      title: strings.notifications.testTitle,
      body: strings.notifications.testBody,
    },
  }
}

/**
 * The three surfaces the widget step shows, from the same plan as Today: the
 * Right now widget, the next prayer as a Lock Screen widget would put it, and
 * the reminder that would arrive.
 */
export function widgetPreview(
  plan: Plan,
  items: Item[],
  strings: Strings,
  now: Date,
): WidgetPreview {
  const { today } = plan
  const headline = items.find((item) => item.id === today.rightNow?.itemId)
  const home = {
    caption: today.window ? windowName(strings, today.window, today.jumuah) : strings.plan.rightNow,
    title: headline ? (resolveText(headline.title) ?? headline.id) : strings.widgets.nothingNow,
    detail: headline ? resolveText(headline.reminder) : null,
  }
  const lock = today.next
    ? {
        title: prayerName(strings, today.next.prayer, today.next.jumuah),
        detail: distanceLabel((today.next.startsAt.getTime() - now.getTime()) / 60_000, strings),
      }
    : { title: home.caption, detail: home.title }

  return { home, lock, notification: reminderPreview(plan, items, strings, now).item }
}
