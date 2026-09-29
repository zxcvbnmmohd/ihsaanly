import type { LocalStore, SyncMeta } from '@ihsaanly/cloud/ports'
import { z } from 'zod'

import {
  markEventsSynced,
  preferenceRowsWithTime,
  resetEventsSynced,
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
    preferences: () => preferenceRowsWithTime().filter((row) => SYNCED_KEYS.has(row.key)),
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
