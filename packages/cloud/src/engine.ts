import type { LocalStore, RemoteChanges, SyncMeta, SyncPreference, SyncRemote } from './ports'

export type SyncOutcome =
  | { status: 'synced'; pulledEvents: number; pushedEvents: number }
  /** This device holds another account's data; the caller asks which way to go. */
  | { status: 'account-mismatch'; boundUid: string }

/**
 * Bumped when the remote layout changes. A device whose meta is older pushes
 * its whole log and every preference again on its next sync, so each device
 * moves its own data into the new layout; nothing migrates server-side.
 * 2: `users/{uid}/sync/*` with readable field names.
 */
export const SYNC_META_VERSION = 2

/** Meta for a device bound to `boundUid` (or nobody) that has synced nothing yet. */
export const freshMeta = (boundUid: string | null): SyncMeta => ({
  version: SYNC_META_VERSION,
  boundUid,
  cursor: null,
  lastSyncedAt: null,
  profileWritten: false,
  syncedPreferences: {},
})

export interface PreferencePlan {
  /** Remote (or merged) values to write on this device, stamps kept. */
  toApply: SyncPreference[]
  /** Values to push: newer here, or merged. */
  toPush: SyncPreference[]
  /** Keys this device dropped that the account still has: delete them remotely. */
  toRemove: string[]
  /** Keys another device dropped that this device has not changed since: delete them here. */
  toDrop: string[]
}

type Merge = NonNullable<LocalStore['mergePreference']>

/**
 * Newer timestamp wins, per key. A tie keeps the remote value, so a device
 * whose preferences predate sync (stamped 0) takes the account's settings.
 * `remote` holds only what changed since the last pull, so a key it lacks is
 * pushed only if its timestamp differs from the one last synced.
 *
 * When both sides changed a key since they last agreed (`synced`), `merge`
 * may combine the two instead (item progress: the higher count, every part);
 * the result is stamped just past both, written here and pushed.
 *
 * Deletions: a synced key gone from this device is removed remotely, and,
 * when `remote` is the full list (non-empty), a synced key gone from it that
 * this device has not touched since is dropped here.
 *
 * ponytail: device clocks decide; a skewed clock can win a race it lost. Fine
 * for settings — the upgrade is a server timestamp per key.
 */
export function newerPreferences(
  local: SyncPreference[],
  remote: SyncPreference[],
  synced: Readonly<Record<string, number>> = {},
  merge?: Merge,
): PreferencePlan {
  const localByKey = new Map(local.map((preference) => [preference.key, preference]))
  const remoteByKey = new Map(remote.map((preference) => [preference.key, preference]))
  const toApply: SyncPreference[] = []
  const toPush: SyncPreference[] = []

  for (const theirs of remote) {
    const ours = localByKey.get(theirs.key)
    const agreed = synced[theirs.key]
    if (!ours) {
      // Dropped here and unchanged there since: the removal wins.
      if (agreed !== theirs.updatedAt) toApply.push(theirs)
      continue
    }
    if (ours.value === theirs.value) {
      if (theirs.updatedAt > ours.updatedAt) toApply.push(theirs)
      else if (ours.updatedAt > theirs.updatedAt) toPush.push(ours)
      continue
    }
    const both = merge && agreed !== theirs.updatedAt && agreed !== ours.updatedAt
    const merged = both ? merge(ours, theirs) : null
    if (merged === null) {
      if (theirs.updatedAt >= ours.updatedAt) toApply.push(theirs)
      else toPush.push(ours)
    } else if (merged === theirs.value) {
      toApply.push(theirs)
    } else if (merged === ours.value && ours.updatedAt > theirs.updatedAt) {
      toPush.push(ours)
    } else {
      const combined = {
        key: ours.key,
        value: merged,
        updatedAt: Math.max(ours.updatedAt, theirs.updatedAt) + 1,
      }
      toApply.push(combined)
      toPush.push(combined)
    }
  }

  for (const ours of local) {
    if (!remoteByKey.has(ours.key) && synced[ours.key] !== ours.updatedAt) toPush.push(ours)
  }

  const toRemove = Object.keys(synced).filter((key) => {
    if (localByKey.has(key)) return false
    const theirs = remoteByKey.get(key)
    return !theirs || theirs.updatedAt === synced[key]
  })
  const toDrop =
    remote.length === 0
      ? []
      : local
          .filter((ours) => !remoteByKey.has(ours.key) && synced[ours.key] === ours.updatedAt)
          .map((ours) => ours.key)

  return { toApply, toPush, toRemove, toDrop }
}

function applyPlan(local: LocalStore, plan: PreferencePlan): void {
  if (plan.toApply.length > 0) local.applyPreferences(plan.toApply)
  if (plan.toDrop.length > 0) local.removePreferences?.(plan.toDrop)
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
  let meta = local.readMeta()
  if (meta.boundUid !== null && meta.boundUid !== uid) {
    return { status: 'account-mismatch', boundUid: meta.boundUid }
  }
  if (meta.version < SYNC_META_VERSION) {
    // Synced under an older layout: start over in this one. Meta is only
    // written once the round succeeds, so a failed round repeats this.
    local.resetSynced()
    meta = { ...freshMeta(meta.boundUid), lastSyncedAt: meta.lastSyncedAt }
  }
  const profile = !meta.profileWritten || meta.boundUid !== uid

  const changes = await remote.pull(uid, meta.cursor)
  const pulledEvents = local.insertRemoteEvents(changes.events)

  const plan = newerPreferences(
    local.preferences(),
    changes.preferences,
    meta.syncedPreferences,
    local.mergePreference,
  )
  applyPlan(local, plan)
  // Read before the push: a change made while it is in flight stays unsynced.
  const settled = local.preferences()

  const pending = local.unsyncedEvents()
  const { toPush, toRemove } = plan
  if (pending.length > 0 || toPush.length > 0 || toRemove.length > 0 || profile) {
    await remote.push(uid, {
      events: pending.map(({ id: _id, ...event }) => event),
      preferences: toPush,
      ...(toRemove.length > 0 ? { removedPreferences: toRemove } : {}),
      profile,
    })
    local.markSynced(pending.map((event) => event.id))
  }

  local.writeMeta({
    version: SYNC_META_VERSION,
    boundUid: uid,
    cursor: changes.cursor,
    lastSyncedAt: now(),
    profileWritten: true,
    syncedPreferences: Object.fromEntries(
      settled.map((preference) => [preference.key, preference.updatedAt]),
    ),
  })
  return { status: 'synced', pulledEvents, pushedEvents: pending.length }
}

/**
 * Folds in changes a live `watch` delivered, without a pull or a push: the
 * listener already paid for the read. Moves the cursor on, so the next round
 * does not read them again. `pending` is true when this device now holds
 * something the account lacks (a merged value, a local change), for the
 * caller to push with its next round. Call it only on a device bound to the
 * watched account, between rounds.
 */
export function applyRemoteChanges(
  local: LocalStore,
  changes: RemoteChanges,
): { pulledEvents: number; pending: boolean } {
  const meta = local.readMeta()
  const pulledEvents = local.insertRemoteEvents(changes.events)
  const plan = newerPreferences(
    local.preferences(),
    changes.preferences,
    meta.syncedPreferences,
    local.mergePreference,
  )
  applyPlan(local, plan)

  const syncedPreferences = { ...meta.syncedPreferences }
  const pushing = new Set(plan.toPush.map((preference) => preference.key))
  for (const applied of plan.toApply) {
    if (!pushing.has(applied.key)) syncedPreferences[applied.key] = applied.updatedAt
  }
  for (const key of plan.toDrop) delete syncedPreferences[key]
  local.writeMeta({ ...meta, cursor: changes.cursor, syncedPreferences })

  return { pulledEvents, pending: plan.toPush.length > 0 || plan.toRemove.length > 0 }
}

/**
 * Settles an `account-mismatch`. `merge` pushes this device's whole log into
 * the new account; `fresh` expects the caller to have wiped local data first.
 */
export function adoptAccount(local: LocalStore, uid: string, mode: 'merge' | 'fresh'): void {
  if (mode === 'merge') local.resetSynced()
  local.writeMeta(freshMeta(uid))
}
