import { itemById } from '@ihsaanly/core/content'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, windowAt } from '@ihsaanly/core/prayer/windows'
import { WIDGET_TAPS_KEY } from '@ihsaanly/state/cloud/keys'
import { getPlace } from '@ihsaanly/state/location/store'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { getCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { createPreferenceStore } from '@ihsaanly/state/storage/preference-store'
import { z } from 'zod'

import type { WidgetTap } from './model'
import { readWidgetTaps } from './taps'

const through = createPreferenceStore(WIDGET_TAPS_KEY, z.number().nonnegative(), 0)

/** Read by `useWidgetTimeline`, so taking taps in republishes the widgets. */
export const useWidgetTapsThrough = through.use

function isTap(value: unknown): value is WidgetTap {
  if (value === null || typeof value !== 'object') return false
  const { id, at } = value as Record<string, unknown>
  return typeof id === 'string' && typeof at === 'number' && Number.isFinite(at)
}

/**
 * The taps not yet taken in, once each, oldest first. The widget writes them,
 * so each is checked rather than trusted; the same tap is read from every
 * entry it was merged into.
 */
export function pendingTaps(taps: unknown[], after: number): WidgetTap[] {
  const seen = new Set<string>()
  return taps
    .filter(isTap)
    .filter((tap) => tap.at > after)
    .filter((tap) => {
      const key = `${tap.id}@${tap.at}`
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

/**
 * Files every waiting widget tap as a completion at the moment of the tap, in
 * the window it fell in, exactly as a tap in the app would have been, then
 * moves the cursor past them so none is filed twice. Returns how many it took.
 */
export async function takeWidgetTaps(): Promise<number> {
  const taps = await readWidgetTaps()
  // Read after the await: a second call that overlapped this one sees the
  // cursor this one moved, and the filing below runs without yielding.
  const fresh = pendingTaps(taps, through.get())
  const last = fresh.at(-1)
  if (!last) return 0

  const place = getPlace()
  const timeZone = place?.timeZone ?? 'UTC'
  const calculation = getCalculationPreferences()
  let taken = 0
  for (const tap of fresh) {
    if (!itemById(tap.id)) continue
    const at = new Date(tap.at)
    const window = place
      ? (windowAt(at, buildWindows(prayerTimesAcross(place, at, calculation))) ?? undefined)
      : undefined
    completeItem(tap.id, at, timeZone, window)
    taken += 1
  }
  through.set(last.at)
  return taken
}
