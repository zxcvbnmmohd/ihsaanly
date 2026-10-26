import { itemById } from '@ihsaanly/core/content'
import { civilDateKey, logDay } from '@ihsaanly/core/day/boundaries'
import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, type PrayerWindow, windowAt } from '@ihsaanly/core/prayer/windows'
import { WIDGET_TAPS_KEY } from '@ihsaanly/state/cloud/keys'
import { getPlace } from '@ihsaanly/state/location/store'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { getUserState } from '@ihsaanly/state/plan/user-state-store'
import { markPrayer } from '@ihsaanly/state/prayer/marks'
import { getCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { periodKeyFor, progressKey, StoredProgress } from '@ihsaanly/state/progress/model'
import {
  addCount,
  clearProgress,
  currentPeriod,
  getItemProgress,
} from '@ihsaanly/state/progress/store'
import { markedPrayersOn } from '@ihsaanly/state/storage/events'
import { createPreferenceStore } from '@ihsaanly/state/storage/preference-store'
import { readPreference } from '@ihsaanly/state/storage/preferences'
import { z } from 'zod'

import type { WidgetTap, WidgetTapKind } from './model'
import { forgetWidgetTaps, readWidgetTaps } from './taps'

const through = createPreferenceStore(WIDGET_TAPS_KEY, z.number().nonnegative(), 0)

/** Read by `useWidgetTimeline`, so taking taps in republishes the widgets. */
export const useWidgetTapsThrough = through.use

const KINDS: readonly WidgetTapKind[] = ['done', 'prayer', 'count']

function isTap(value: unknown): value is WidgetTap {
  if (value === null || typeof value !== 'object') return false
  const { kind, id, at } = value as Record<string, unknown>
  return (
    (kind === undefined || KINDS.some((known) => known === kind)) &&
    typeof id === 'string' &&
    typeof at === 'number' &&
    Number.isFinite(at)
  )
}

/** A tap from before kinds existed marked the Right now item done. */
export function tapKind(tap: WidgetTap): WidgetTapKind {
  return tap.kind ?? 'done'
}

function isPrayer(id: string): id is Prayer {
  return PRAYERS.some((prayer) => prayer === id)
}

/**
 * The taps not yet taken in, once each, oldest first. The widget writes them,
 * so each is checked rather than trusted; the same tap is read from every
 * entry (and every widget) it was merged into.
 */
export function pendingTaps(taps: unknown[], after: number): WidgetTap[] {
  const seen = new Set<string>()
  return taps
    .filter(isTap)
    .filter((tap) => tap.at > after)
    .filter((tap) => {
      const key = `${tapKind(tap)}:${tap.id}@${tap.at}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => left.at - right.at)
}

/** Taps still waiting, for a republish to carry so none is dropped by the rewrite. */
export async function waitingTaps(): Promise<WidgetTap[]> {
  return pendingTaps(await readWidgetTaps(), through.get())
}

interface Filing {
  timeZone: string
  windowsAt: (at: Date) => PrayerWindow[]
}

/** Done, as a tap in the app would be: at the tap's moment, in its window. */
function fileDone(tap: WidgetTap, { timeZone, windowsAt }: Filing): boolean {
  if (!itemById(tap.id)) return false
  const at = new Date(tap.at)
  completeItem(tap.id, at, timeZone, windowAt(at, windowsAt(at)) ?? undefined)
  return true
}

/**
 * Prayed, as Today's strip marks it, against that prayer's latest window. A
 * widget only marks, so a prayer already marked that day is left alone, and
 * nothing is filed while tracking is paused.
 */
function filePrayer(tap: WidgetTap, { timeZone, windowsAt }: Filing): boolean {
  if (!isPrayer(tap.id) || getUserState().trackingPaused) return false
  const at = new Date(tap.at)
  const prayer = tap.id
  if (markedPrayersOn(civilDateKey(logDay(at, timeZone))).includes(prayer)) return false
  const window = windowsAt(at)
    .filter((entry) => entry.name === prayer && entry.startsAt <= at)
    .at(-1)
  markPrayer(prayer, at, timeZone, window)
  return true
}

/**
 * One item's counting taps from one period. Counted toward its progress
 * while that period is still the current one; the tap that reaches the
 * item's repeat files it done at that tap's moment, whether or not its
 * period has passed. Returns how many were taken.
 */
function fileCounts(
  itemId: string,
  periodKey: string,
  taps: WidgetTap[],
  { timeZone, windowsAt }: Filing,
): number {
  const item = itemById(itemId)
  if (!item || item.repeat <= 1) return 0
  const live = periodKey === currentPeriod(itemId)
  const stored = readPreference(progressKey(itemId), StoredProgress)
  const base = live
    ? getItemProgress(itemId).count
    : stored?.periodKey === periodKey
      ? stored.count
      : 0
  const finishing = taps[Math.max(1, item.repeat - base) - 1]
  if (finishing) {
    const at = new Date(finishing.at)
    completeItem(itemId, at, timeZone, windowAt(at, windowsAt(at)) ?? undefined)
    if (live || stored?.periodKey === periodKey) clearProgress(itemId)
  } else if (live) {
    addCount(itemId, taps.length)
  }
  return taps.length
}

/**
 * Files every waiting widget tap at the moment it was made, exactly as the
 * same tap in the app would have been — an item done, a prayer marked, a
 * count — then moves the cursor past them so none is filed twice. Returns
 * how many it took.
 */
export async function takeWidgetTaps(): Promise<number> {
  const taps = await readWidgetTaps()
  // Read after the await: a second call that overlapped this one sees the
  // cursor this one moved, and the filing below runs without yielding.
  const fresh = pendingTaps(taps, through.get())
  const last = fresh.at(-1)
  if (!last) return 0

  const place = getPlace()
  const calculation = getCalculationPreferences()
  const filing: Filing = {
    timeZone: place?.timeZone ?? 'UTC',
    windowsAt: (at) => (place ? buildWindows(prayerTimesAcross(place, at, calculation)) : []),
  }

  let taken = 0
  const counted = new Map<string, { itemId: string; periodKey: string; taps: WidgetTap[] }>()
  for (const tap of fresh) {
    const kind = tapKind(tap)
    if (kind === 'done' && fileDone(tap, filing)) taken += 1
    if (kind === 'prayer' && filePrayer(tap, filing)) taken += 1
    if (kind === 'count') {
      const item = itemById(tap.id)
      if (!item) continue
      const at = new Date(tap.at)
      const periodKey = periodKeyFor(
        item.trigger,
        civilDateKey(logDay(at, filing.timeZone)),
        windowAt(at, filing.windowsAt(at))?.name ?? null,
      )
      const key = `${tap.id} ${periodKey}`
      const group = counted.get(key) ?? { itemId: tap.id, periodKey, taps: [] }
      group.taps.push(tap)
      counted.set(key, group)
    }
  }
  for (const group of counted.values()) {
    taken += fileCounts(group.itemId, group.periodKey, group.taps, filing)
  }

  through.set(last.at)
  // Android keeps taps in a file of its own; what is filed leaves it.
  await forgetWidgetTaps(last.at).catch(() => {})
  return taken
}
