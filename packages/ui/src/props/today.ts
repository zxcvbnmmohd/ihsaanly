// Pure "plan → Today screen props" helpers, shared by the app's Today route
// and the marketing site's demo engine, which mirrors it for the browser.
// Nothing here reads a store or the clock: every input is a value the host
// already has (plan output, strings, an item lookup, the current instant).

import { resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import type { NextPrayer, PlannedItem } from '@ihsaanly/core/plan/signals'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { NextPrayerEntry, TodayEntry } from '../screens/today'
import type { EntryMark, TodayPanel } from '../types'

/** Looks an item up by id from whichever content source the host uses. */
export type ItemLookup = (id: string) => Item | undefined

export function caveatLabel(caveat: PlannedItem['caveat'], strings: Strings): string | null {
  if (caveat === 'confirm-locally') return strings.plan.confirmLocally
  if (caveat === 'expected') return strings.plan.expected
  return null
}

export function whenLabel(planned: PlannedItem, strings: Strings): string | null {
  if (planned.reason !== 'upcoming') return null
  return planned.daysAway === 1 ? strings.plan.tomorrow : strings.plan.inDays(planned.daysAway ?? 0)
}

export function detailFor(
  planned: PlannedItem,
  strings: Strings,
  showWhen: boolean,
): string | null {
  const parts = [
    showWhen ? whenLabel(planned, strings) : null,
    planned.optional ? strings.plan.optional : null,
    caveatLabel(planned.caveat, strings),
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(' · ') : null
}

/** A rough distance, never a clock time: the app says how the day feels, not when it ticks. */
export function distanceLabel(minutes: number, strings: Strings): string {
  if (minutes < 45) return strings.plan.soon
  if (minutes < 90) return strings.plan.inAboutAnHour
  return strings.plan.inAboutHours(Math.round(minutes / 60))
}

export function itemEntry(id: string, lookup: ItemLookup): TodayEntry | null {
  const item = lookup(id)
  return item
    ? { id, title: resolveText(item.title) ?? id, detail: null, href: `/item/${id}`, mark: null }
    : null
}

export function toNext(
  next: NextPrayer | null,
  now: Date,
  strings: Strings,
  lookup: ItemLookup,
): NextPrayerEntry | null {
  if (!next) return null
  return {
    prayer: next.prayer,
    jumuah: next.jumuah,
    distance: distanceLabel((next.startsAt.getTime() - now.getTime()) / 60_000, strings),
    before: next.before.flatMap((id) => itemEntry(id, lookup) ?? []),
    after: next.after.flatMap((id) => itemEntry(id, lookup) ?? []),
  }
}

export function toEntry(
  planned: PlannedItem,
  strings: Strings,
  lookup: ItemLookup,
  showWhen = true,
): TodayEntry | null {
  const item = lookup(planned.itemId)
  if (!item) return null

  return {
    id: planned.itemId,
    title: resolveText(item.title) ?? item.id,
    detail: detailFor(planned, strings, showWhen),
    href: `/item/${item.id}`,
    mark: null,
  }
}

/**
 * The plan returns today's all-day items and the look-ahead in one list. They
 * are different questions — what to do today, and what to prepare for — so
 * they are split here rather than shown under one caption that reads as
 * "not now".
 */
export function split(entries: PlannedItem[]): {
  allDay: PlannedItem[]
  tomorrow: PlannedItem[]
  later: PlannedItem[]
} {
  return {
    allDay: entries.filter((entry) => entry.reason === 'today'),
    tomorrow: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && entry.daysAway === 1),
    ),
    later: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && (entry.daysAway ?? 0) > 1),
    ),
  }
}

/**
 * The White Days are three consecutive days, so the look-ahead returns the
 * same item once per day. Three identical rows say nothing the first does, and
 * they collide as React keys, so only the soonest is kept.
 */
export function soonestEach(entries: PlannedItem[]): PlannedItem[] {
  const soonest = new Map<string, PlannedItem>()

  for (const entry of entries) {
    const seen = soonest.get(entry.itemId)
    if (!seen || (entry.daysAway ?? 0) < (seen.daysAway ?? 0)) soonest.set(entry.itemId, entry)
  }

  return [...soonest.values()].sort((a, b) => (a.daysAway ?? 0) - (b.daysAway ?? 0))
}

/** Guards the store write with the timezone the caller may not have yet. */
export function onMakeUpFor(
  timeZone: string | undefined,
  now: Date,
  markMadeUp: (prayer: Prayer, now: Date, timeZone: string) => void,
): (prayer: Prayer) => void {
  return (prayer) => {
    if (timeZone) markMadeUp(prayer, now, timeZone)
  }
}

/** Where an item has got in its current period: taps counted, part ids said. */
export interface ProgressSoFar {
  count: number
  parts: readonly string[]
}

/** How an item is done: in one go, by counting to its repeat, or part by part. */
export function markKind(item: Pick<Item, 'repeat' | 'parts'>): 'once' | 'count' | 'parts' {
  if ((item.parts ?? []).length > 0) return 'parts'
  return item.repeat > 1 ? 'count' : 'once'
}

/** The circle for a row: done, or how far it has got (a ring) when it is done in steps. */
export function markFor(
  item: Pick<Item, 'repeat' | 'parts'>,
  done: boolean,
  progress: ProgressSoFar,
): EntryMark {
  const kind = markKind(item)
  if (done || kind === 'once') return { done, progress: null }
  if (kind === 'count') {
    return { done, progress: { kind: 'count', value: progress.count, total: item.repeat } }
  }
  const parts = item.parts ?? []
  return {
    done,
    progress: {
      kind: 'parts',
      value: parts.filter((part) => progress.parts.includes(part.id)).length,
      total: parts.length,
    },
  }
}

/** The sheet a stepped item opens in: the counter, or the checklist of its parts. */
export function panelFor(item: Item, progress: ProgressSoFar): TodayPanel | null {
  const title = resolveText(item.title) ?? item.id
  switch (markKind(item)) {
    case 'count':
      return { kind: 'count', itemId: item.id, title, count: progress.count, target: item.repeat }
    case 'parts':
      return {
        kind: 'parts',
        itemId: item.id,
        title,
        parts: (item.parts ?? []).map((part) => ({
          id: part.id,
          title: resolveText(part.title) ?? part.id,
          done: progress.parts.includes(part.id),
        })),
      }
    default:
      return null
  }
}
