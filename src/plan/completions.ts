import { civilDateKey, logDay } from '@/day/boundaries'
import { recordEvent, useCompletedOn } from '@/storage/events'

/**
 * Completions are filed against the local calendar day, like prayer marks:
 * History reads by that day, and the planner's "today" is the civil day too,
 * so "done today" and "relevant today" always agree.
 */
export function completeItem(
  itemId: string,
  at: Date,
  timeZone: string,
  window?: { startsAt: Date; endsAt: Date },
): void {
  recordEvent({
    kind: 'item-completed',
    subject: itemId,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
    windowStart: window?.startsAt,
    windowEnd: window?.endsAt,
  })
}

export function uncompleteItem(itemId: string, at: Date, timeZone: string): void {
  recordEvent({
    kind: 'item-uncompleted',
    subject: itemId,
    at,
    logDay: civilDateKey(logDay(at, timeZone)),
  })
}

export function useCompletedToday(timeZone: string, now: Date): Partial<Record<string, Date>> {
  return useCompletedOn(civilDateKey(logDay(now, timeZone)))
}
