import type { Prayer } from '@ihsaanly/core/plan/signals'
import type { NotificationContent } from './content'
import { PLAN_PREFIX, PRAYER_LATER_PREFIX } from './payload'

export interface SyncPlan {
  /** Identifiers to cancel. Only ever ones the plan owns. */
  cancel: string[]
  /** Entries to schedule, being the wanted ones not already pending. */
  add: NotificationContent[]
}

/**
 * Which reminders to cancel and which to add, decided without touching the
 * platform. Two rules carry the weight, and both have a reason:
 *
 * Only `plan:` identifiers are ever cancelled. A snooze from the notification
 * shade is filed under `later:` and a test under `test:`, and a snooze made
 * while the app was killed has to survive the next sync.
 *
 * An entry already pending is left alone rather than cancelled and re-added, so
 * running this twice changes nothing and a reminder never loses its place.
 *
 * The exceptions to the first rule are a prayer's second ask: while tracking
 * is `paused` every one is cancelled, so no prayer prompt fires during a
 * pause, and once a prayer is `marked` today its own is, since the question
 * has been answered (on Today, from a widget or on another device).
 */
export function planSync(
  contents: NotificationContent[],
  pendingIds: string[],
  now: number,
  paused = false,
  marked: readonly Prayer[] = [],
): SyncPlan {
  const future = contents.filter((content) => content.at.getTime() > now)
  const wanted = new Map(future.map((content) => [content.identifier, content]))
  const ours = pendingIds.filter((id) => id.startsWith(PLAN_PREFIX))
  const asksAgain = pendingIds.filter((id) => id.startsWith(PRAYER_LATER_PREFIX))
  const answered = (id: string): boolean =>
    marked.some((prayer) => id.startsWith(`${PRAYER_LATER_PREFIX}${prayer}@`))

  return {
    cancel: [
      ...ours.filter((id) => !wanted.has(id)),
      ...asksAgain.filter((id) => paused || answered(id)),
    ],
    add: future.filter((content) => !ours.includes(content.identifier)),
  }
}
