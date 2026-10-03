/**
 * The preference keys that travel with an account. An allowlist rather than a
 * denylist on purpose: a key added later stays on the device until someone
 * decides it belongs in the cloud, instead of leaking there by default.
 *
 * Left out, deliberately:
 * - `events`: its `home` region holds the exact coordinates of someone's front
 *   door (a 150 m geofence). Coordinates that precise never leave the device;
 *   the synced `place` is rounded to ~1 km on the way out instead.
 * - `failureLog`: this device's diagnostics, meaningless anywhere else.
 * - `qadaProcessedThrough`: this device's rollover cursor. Each device accrues
 *   misses itself; they share an identity, so the log dedupes them.
 * - `sync`, `account`: the sync machinery's own bookkeeping, below.
 * - `feedbackOutbox`: feedback waiting to be sent. It goes to the `feedback`
 *   collection when it is sent, never through sync.
 * - `announcements`, `crashReports`: per-device opt-ins, below.
 */
export const SYNCED_KEYS: ReadonlySet<string> = new Set([
  'calculation',
  'enabledItems',
  'fastBacklog',
  'hijriOffset',
  'knownItems',
  'locale',
  'notifications',
  'onboarding',
  'place',
  'qadaBacklog',
  'suggestion',
  'theme',
  'userState',
])

/**
 * Item progress (`progress:<itemId>`, see progress/model.ts) syncs too, one
 * key per item, so two devices counting different items never collide. A
 * prefix rather than names: the items come from content.
 */
export const PROGRESS_PREFIX = 'progress:'

export const isProgressKey = (key: string): boolean => key.startsWith(PROGRESS_PREFIX)

/** Whether a preference key travels with the account. */
export const isSyncedKey = (key: string): boolean => SYNCED_KEYS.has(key) || isProgressKey(key)

/**
 * The rules cap the synced preferences at 64 keys. Progress keys for
 * finished days are pruned on every progress write; this bounds the rest
 * (several periods in one day), leaving room for the named keys and a few
 * more of them.
 */
export const MAX_PROGRESS_KEYS = 64 - SYNCED_KEYS.size - 8

/** Sync's cursor and the account this device's data is bound to. */
export const SYNC_META_KEY = 'sync'

/**
 * Whether someone has signed in on this device. Read at launch to decide if
 * the cloud code needs loading at all; until then it never does.
 */
export const ACCOUNT_KEY = 'account'

/** Feedback written but not yet accepted by the server, oldest first. */
export const FEEDBACK_OUTBOX_KEY = 'feedbackOutbox'

/**
 * Whether this device receives announcements, and which language's topic it
 * is subscribed to. Per device: the OS permission and the push registration
 * belong to the device, so turning it on here must not turn it on elsewhere.
 */
export const ANNOUNCEMENTS_KEY = 'announcements'

/** Whether this device sends crash reports. Per device, for the same reason. */
export const CRASH_REPORTS_KEY = 'crashReports'

/**
 * What Today has taught on this device: whether its tour has been seen, and
 * how many prayers have been marked (the hint under the strip stops after a
 * few). Per device, since each screen is learned where it is used.
 */
export const TODAY_HINTS_KEY = 'todayHints'

/** Device bookkeeping that never belongs in an export either. */
export const DEVICE_ONLY_KEYS: ReadonlySet<string> = new Set([
  SYNC_META_KEY,
  ACCOUNT_KEY,
  FEEDBACK_OUTBOX_KEY,
  ANNOUNCEMENTS_KEY,
  CRASH_REPORTS_KEY,
  TODAY_HINTS_KEY,
])
