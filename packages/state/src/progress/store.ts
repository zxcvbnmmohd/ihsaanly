import { civilDateKey, logDay } from '@ihsaanly/core/day/boundaries'
import { useSyncExternalStore } from 'react'
import { isProgressKey, MAX_PROGRESS_KEYS } from '../cloud/keys'
import { completeItem, uncompleteItem } from '../plan/completions'
import { deletePreferenceRows, preferenceRowsWithTime, readPreferenceRow } from '../storage/backend'
import { noteLocalWrite } from '../storage/local-writes'
import { onPreferencesReload } from '../storage/preference-store'
import { readPreference, writePreference } from '../storage/preferences'
import {
  dayOf,
  isFinished,
  normalize,
  type ProgressTarget,
  parseProgress,
  progressKey,
  StoredProgress,
} from './model'

/** Where an item stands in its current period. */
export interface ItemProgress {
  count: number
  /** Part ids done, sorted. */
  parts: string[]
}

/**
 * What the store needs from the app to know an item's period. The defaults
 * keep progress per calendar day in the device's zone; the app passes
 * `periodOf` built on `periodKeyFor` (the item's trigger, today's log day,
 * the prayer window now) so adhkar reset per window.
 */
export interface ProgressContext {
  periodOf: (itemId: string) => string
  now: () => Date
  timeZone: () => string
  /** The window an item is being done in, recorded with its completion. */
  windowOf?: (itemId: string) => { startsAt: Date; endsAt: Date } | undefined
}

const defaults: ProgressContext = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  periodOf: () => `${civilDateKey(logDay(context.now(), context.timeZone()))}:day`,
}

let context: ProgressContext = defaults
const listeners = new Set<() => void>()
const cache = new Map<string, { periodKey: string; value: ItemProgress }>()
const EMPTY: ItemProgress = { count: 0, parts: [] }
let revision = 0

function changed(): void {
  revision += 1
  cache.clear()
  listeners.forEach((listener) => listener())
}

// A sync wrote (or dropped) progress underneath: read it again.
onPreferencesReload(changed)

/** Sets how periods and times are worked out. Returns a reset to the defaults. */
export function configureProgress(next: Partial<ProgressContext>): () => void {
  context = { ...defaults, ...next }
  changed()
  return (): void => {
    context = defaults
    changed()
  }
}

/** The item's progress now; none when nothing is stored or it is from another period. */
export function getItemProgress(itemId: string): ItemProgress {
  const periodKey = context.periodOf(itemId)
  const cached = cache.get(itemId)
  if (cached?.periodKey === periodKey) return cached.value

  const stored = readPreference(progressKey(itemId), StoredProgress)
  const value =
    stored?.periodKey === periodKey ? { count: stored.count, parts: stored.parts } : EMPTY
  cache.set(itemId, { periodKey, value })
  return value
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function useItemProgress(itemId: string): ItemProgress {
  return useSyncExternalStore(subscribe, () => getItemProgress(itemId))
}

/**
 * A number that moves whenever any item's progress may have: for a reader of
 * many items (Today's rows), which then reads each with `getItemProgress`.
 */
export function useProgressRevision(): number {
  return useSyncExternalStore(subscribe, () => revision)
}

/**
 * Drops progress the rules' 64-key cap cannot afford: every other item's
 * from an earlier day (or unreadable), then the oldest beyond
 * `MAX_PROGRESS_KEYS`. Each drop is a local write, so sync deletes it
 * remotely too.
 */
function prune(keep: string, today: string): void {
  const finished: string[] = []
  const live: { key: string; updatedAt: number }[] = []
  for (const row of preferenceRowsWithTime()) {
    if (!isProgressKey(row.key) || row.key === keep) continue
    const stored = parseProgress(row.value)
    if (!stored || dayOf(stored.periodKey) < today) finished.push(row.key)
    else live.push(row)
  }
  const excess = live.length + 1 - MAX_PROGRESS_KEYS
  if (excess > 0) {
    live.sort((a, b) => a.updatedAt - b.updatedAt)
    finished.push(...live.slice(0, excess).map((row) => row.key))
  }
  if (finished.length === 0) return
  deletePreferenceRows(finished)
  finished.forEach(noteLocalWrite)
}

function write(itemId: string, next: ItemProgress): ItemProgress {
  const periodKey = context.periodOf(itemId)
  const key = progressKey(itemId)
  writePreference(
    key,
    normalize({
      periodKey,
      count: next.count,
      parts: next.parts,
      updatedAt: context.now().getTime(),
    }),
  )
  prune(key, dayOf(periodKey))
  changed()
  return getItemProgress(itemId)
}

/** Counts `by` more (fewer, if negative; never below zero). */
export function addCount(itemId: string, by = 1): ItemProgress {
  const current = getItemProgress(itemId)
  return write(itemId, { count: Math.max(0, current.count + by), parts: current.parts })
}

export function setPartDone(itemId: string, partId: string, done: boolean): ItemProgress {
  const current = getItemProgress(itemId)
  const parts = done ? [...current.parts, partId] : current.parts.filter((part) => part !== partId)
  return write(itemId, { count: current.count, parts })
}

/** Forgets the item's progress here and, at the next sync, everywhere. */
export function clearProgress(itemId: string): void {
  const key = progressKey(itemId)
  if (!readPreferenceRow(key)) return
  deletePreferenceRows([key])
  noteLocalWrite(key)
  changed()
}

/** Records the item done (the `item-completed` event) and clears its progress. */
export function markAllDone(itemId: string): void {
  completeItem(itemId, context.now(), context.timeZone(), context.windowOf?.(itemId))
  clearProgress(itemId)
}

/**
 * Marks the item done if its progress has reached `target` (pass the item):
 * every part for an item with parts, else its repeat count. Returns whether it did.
 */
export function completeIfFinished(itemId: string, target: ProgressTarget): boolean {
  if (!isFinished(getItemProgress(itemId), target)) return false
  markAllDone(itemId)
  return true
}

/** Takes a completion back (`item-uncompleted`); `uncompleteItem` starts its progress over. */
export function unmarkItem(itemId: string): void {
  uncompleteItem(itemId, context.now(), context.timeZone())
}
