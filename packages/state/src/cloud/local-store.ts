import type { LocalStore, SyncMeta } from '@ihsaanly/cloud/ports'
import { z } from 'zod'

import {
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
import { SYNC_META_KEY, SYNCED_KEYS } from './keys'

const Meta = z.object({
  boundUid: z.string().nullable(),
  cursor: z.string().nullable(),
  lastSyncedAt: z.number().nullable(),
})

const EMPTY_META: SyncMeta = { boundUid: null, cursor: null, lastSyncedAt: null }

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
  return readPreference(SYNC_META_KEY, Meta) ?? EMPTY_META
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
        .filter((row) => SYNCED_KEYS.has(row.key))
        .map(forSync),
    applyPreferences: (preferences): void => {
      // A key this build does not sync (a newer build's, say) stays in the cloud.
      preferences
        .filter((preference) => SYNCED_KEYS.has(preference.key))
        .forEach((preference) =>
          writePreferenceRowAt(preference.key, preference.value, preference.updatedAt),
        )
      reloadPreferences()
    },
    readMeta: readSyncMeta,
    writeMeta: (meta): void => writePreferenceRow(SYNC_META_KEY, JSON.stringify(meta)),
  }
}
