import type { Trigger } from '@ihsaanly/core/content/schema'
import type { WindowName } from '@ihsaanly/core/prayer/windows'
import { z } from 'zod'
import { PROGRESS_PREFIX } from '../cloud/keys'

/**
 * Partial progress on one item — taps of a tasbih, parts of the morning
 * adhkar said — for the period the item is in now. Stored as the synced
 * preference `progress:<itemId>`, so another device picks it up where this
 * one left off. Progress from another period reads as none: it resets itself.
 */
export const StoredProgress = z.object({
  periodKey: z.string().min(1),
  count: z.number().int().nonnegative(),
  /** Part ids done, sorted, so two devices write the same text for the same progress. */
  parts: z.array(z.string()),
  updatedAt: z.number(),
})
export type StoredProgress = z.infer<typeof StoredProgress>

export const progressKey = (itemId: string): string => `${PROGRESS_PREFIX}${itemId}`

/**
 * The period an item's progress belongs to: its log day, and within the day
 * the window or prayer that recurs.
 *
 * - `window` items (morning/evening adhkar): `2026-10-03:morning`
 * - `prayer` items: the prayer (`2026-10-03:fajr`, `…:jumuah`); for `any`
 *   (after every prayer) the prayer window it is done in, so the count
 *   starts again after the next prayer (`…:day` outside any window)
 * - `day` items: the day (`2026-10-03:day`)
 * - `event` items: the event, per day (`2026-10-03:eating`)
 *
 * `window` is the prayer window the item is being done in, where the caller
 * knows it (`windowAt`); only `any` items read it.
 */
export function periodKeyFor(
  trigger: Trigger,
  logDay: string,
  window: WindowName | null = null,
): string {
  switch (trigger.kind) {
    case 'window':
      return `${logDay}:${trigger.window}`
    case 'prayer':
      return `${logDay}:${trigger.prayer === 'any' ? (window ?? 'day') : trigger.prayer}`
    case 'day':
      return `${logDay}:day`
    case 'event':
      return `${logDay}:${trigger.event}`
  }
}

/** The log day a period key starts with. */
export const dayOf = (periodKey: string): string => periodKey.split(':')[0] ?? periodKey

/** Parts deduplicated and sorted, fields in one order: the same progress is the same text. */
export function normalize(progress: StoredProgress): StoredProgress {
  return {
    periodKey: progress.periodKey,
    count: progress.count,
    parts: [...new Set(progress.parts)].sort(),
    updatedAt: progress.updatedAt,
  }
}

export function parseProgress(json: string): StoredProgress | null {
  try {
    return StoredProgress.safeParse(JSON.parse(json)).data ?? null
  } catch {
    return null
  }
}

/**
 * Two devices counted the same item in the same period at once: keep both,
 * the higher count and every part either did. Commutative, so both devices
 * arrive at the same text. Different periods (or anything unreadable) are
 * left to newest-wins: the newer period is the live one.
 */
export function mergeProgress(ours: string, theirs: string): string | null {
  const a = parseProgress(ours)
  const b = parseProgress(theirs)
  if (!a || !b || a.periodKey !== b.periodKey) return null
  return JSON.stringify(
    normalize({
      periodKey: a.periodKey,
      count: Math.max(a.count, b.count),
      parts: [...a.parts, ...b.parts],
      updatedAt: Math.max(a.updatedAt, b.updatedAt),
    }),
  )
}

/** What finishing an item takes: its repeat count, or every one of its parts. `Item` fits. */
export interface ProgressTarget {
  repeat: number
  parts?: readonly { id: string }[]
}

/** An item with parts is done when every part is; otherwise when the count reaches its repeat. */
export function isFinished(
  progress: { count: number; parts: readonly string[] },
  target: ProgressTarget,
): boolean {
  const parts = target.parts ?? []
  if (parts.length > 0) return parts.every((part) => progress.parts.includes(part.id))
  return progress.count >= target.repeat
}
