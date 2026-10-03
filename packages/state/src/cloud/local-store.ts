import { freshMeta } from '@ihsaanly/cloud/engine'
import type { LocalStore, SyncMeta } from '@ihsaanly/cloud/ports'
import { z } from 'zod'

import { mergeProgress } from '../progress/model'
import {
  deletePreferenceRows,
  markEventsSynced,
  preferenceRowsWithTime,
  resetEventsSynced,
  type TimedPreferenceRow,
  unsyncedEventRows,
  writePreferenceRow,
  writePreferenceRowAt,
} from '../storage/backend'
import { insertSyncedEvents } from '../storage/events'
import { reloadPreferences } from '../storage/preference-store'
import { readPreference } from '../storage/preferences'
import { isProgressKey, isSyncedKey, SYNC_META_KEY } from './keys'

/**
 * Meta written before layout 2 has none of the newer fields; it parses as
 * version 1, which makes the next sync push everything again (engine.ts).
 */
const Meta = z.object({
  version: z.number().default(1),
  boundUid: z.string().nullable(),
  cursor: z.string().nullable(),
  lastSyncedAt: z.number().nullable(),
  profileWritten: z.boolean().default(false),
  syncedPreferences: z.record(z.string(), z.number()).default({}),
})

/** Two decimals of a degree is about 1 km: the most precision any coordinate leaves the device with. */
export const roundCoordinate = (degrees: number): number => Math.round(degrees * 100) / 100

/**
 * The copy of a preference that leaves the device. The place is coarsened to
 * about 1 km: prayer windows do not change meaningfully over that distance,
 * and the privacy policy promises the cloud never holds anything finer. The
 * local row keeps full precision; only the outgoing value is rounded.
 */
function forSync(row: TimedPreferenceRow): TimedPreferenceRow {
  if (row.key !== 'place') return row
  try {
    const place: unknown = JSON.parse(row.value)
    if (
      typeof place !== 'object' ||
      place === null ||
      !('latitude' in place) ||
      !('longitude' in place) ||
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    )
      return row
    return {
      ...row,
      value: JSON.stringify({
        ...place,
        latitude: roundCoordinate(place.latitude),
        longitude: roundCoordinate(place.longitude),
      }),
    }
  } catch {
    return row
  }
}

export function readSyncMeta(): SyncMeta {
  return readPreference(SYNC_META_KEY, Meta) ?? freshMeta(null)
}

/**
 * The device side of `syncOnce`, over the same storage seam everything else
 * uses. Writes made here go straight to the backend, never through
 * `writePreference`, so applying a pull does not count as a local change and
 * schedule a push of itself.
 */
export function createLocalStore(): LocalStore {
  return {
    unsyncedEvents: unsyncedEventRows,
    markSynced: markEventsSynced,
    resetSynced: resetEventsSynced,
    insertRemoteEvents: insertSyncedEvents,
    preferences: () =>
      preferenceRowsWithTime()
        .filter((row) => isSyncedKey(row.key))
        .map(forSync),
    applyPreferences: (preferences): void => {
      // A key this build does not sync (a newer build's, say) stays in the cloud.
      preferences
        .filter((preference) => isSyncedKey(preference.key))
        .forEach((preference) =>
          writePreferenceRowAt(preference.key, preference.value, preference.updatedAt),
        )
      reloadPreferences()
    },
    // Only progress is ever dropped (a finished item, a finished period);
    // a settings key missing from the account is never a reason to lose it here.
    removePreferences: (keys): void => {
      const progress = keys.filter(isProgressKey)
      if (progress.length === 0) return
      deletePreferenceRows(progress)
      reloadPreferences()
    },
    mergePreference: (ours, theirs) =>
      isProgressKey(ours.key) ? mergeProgress(ours.value, theirs.value) : null,
    readMeta: readSyncMeta,
    writeMeta: (meta): void => writePreferenceRow(SYNC_META_KEY, JSON.stringify(meta)),
  }
}
