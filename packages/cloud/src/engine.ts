import type { LocalStore, SyncPreference, SyncRemote } from './ports'

export type SyncOutcome =
  | { status: 'synced'; pulledEvents: number; pushedEvents: number }
  /** This device holds another account's data; the caller asks which way to go. */
  | { status: 'account-mismatch'; boundUid: string }

/**
 * Newer timestamp wins, per key. A tie keeps the remote value, so a device
 * whose preferences predate sync (stamped 0) takes the account's settings.
 *
 * ponytail: device clocks decide; a skewed clock can win a race it lost. Fine
 * for settings — the upgrade is a server timestamp per key.
 */
export function newerPreferences(
  local: SyncPreference[],
  remote: SyncPreference[],
): { toApply: SyncPreference[]; toPush: SyncPreference[] } {
  const localByKey = new Map(local.map((preference) => [preference.key, preference]))
  const remoteByKey = new Map(remote.map((preference) => [preference.key, preference]))

  return {
    toApply: remote.filter((theirs) => {
      const ours = localByKey.get(theirs.key)
      if (!ours) return true
      if (theirs.updatedAt !== ours.updatedAt) return theirs.updatedAt > ours.updatedAt
      return theirs.value !== ours.value
    }),
    toPush: local.filter((ours) => ours.updatedAt > (remoteByKey.get(ours.key)?.updatedAt ?? -1)),
  }
}

/**
 * One round: pull what changed since the cursor, fold it in, push what this
 * device has that the account lacks. Pull comes first so a push never
 * overwrites a newer preference. Safe to repeat — events are unique by
 * identity on both sides and preferences only move forward.
 */
export async function syncOnce(
  local: LocalStore,
  remote: SyncRemote,
  uid: string,
  now: () => number = Date.now,
): Promise<SyncOutcome> {
  const meta = local.readMeta()
  if (meta.boundUid !== null && meta.boundUid !== uid) {
    return { status: 'account-mismatch', boundUid: meta.boundUid }
  }

  const changes = await remote.pull(uid, meta.cursor)
  const pulledEvents = local.insertRemoteEvents(changes.events)

  const { toApply, toPush } = newerPreferences(local.preferences(), changes.preferences)
  if (toApply.length > 0) local.applyPreferences(toApply)

  const pending = local.unsyncedEvents()
  if (pending.length > 0 || toPush.length > 0) {
    await remote.push(uid, {
      events: pending.map(({ id: _id, ...event }) => event),
      preferences: toPush,
    })
    local.markSynced(pending.map((event) => event.id))
  }

  local.writeMeta({ boundUid: uid, cursor: changes.cursor, lastSyncedAt: now() })
  return { status: 'synced', pulledEvents, pushedEvents: pending.length }
}

/**
 * Settles an `account-mismatch`. `merge` pushes this device's whole log into
 * the new account; `fresh` expects the caller to have wiped local data first.
 */
export function adoptAccount(local: LocalStore, uid: string, mode: 'merge' | 'fresh'): void {
  if (mode === 'merge') local.resetSynced()
  local.writeMeta({ boundUid: uid, cursor: null, lastSyncedAt: null })
}
