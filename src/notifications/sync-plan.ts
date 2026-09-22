import type { NotificationContent } from './content'
import { PLAN_PREFIX } from './payload'

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
 */
export function planSync(
  contents: NotificationContent[],
  pendingIds: string[],
  now: number,
): SyncPlan {
  const future = contents.filter((content) => content.at.getTime() > now)
  const wanted = new Map(future.map((content) => [content.identifier, content]))
  const ours = pendingIds.filter((id) => id.startsWith(PLAN_PREFIX))

  return {
    cancel: ours.filter((id) => !wanted.has(id)),
    add: future.filter((content) => !ours.includes(content.identifier)),
  }
}
