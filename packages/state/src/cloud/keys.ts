/**
 * The preference keys that travel with an account. An allowlist rather than a
 * denylist on purpose: a key added later stays on the device until someone
 * decides it belongs in the cloud, instead of leaking there by default.
 *
 * Left out, deliberately:
 * - `failureLog`: this device's diagnostics, meaningless anywhere else.
 * - `qadaProcessedThrough`: this device's rollover cursor. Each device accrues
 *   misses itself; they share an identity, so the log dedupes them.
 * - `sync`, `account`: the sync machinery's own bookkeeping, below.
 */
export const SYNCED_KEYS: ReadonlySet<string> = new Set([
  'calculation',
  'enabledItems',
  'events',
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

/** Sync's cursor and the account this device's data is bound to. */
export const SYNC_META_KEY = 'sync'

/**
 * Whether someone has signed in on this device. Read at launch to decide if
 * the cloud code needs loading at all; until then it never does.
 */
export const ACCOUNT_KEY = 'account'

/** Device bookkeeping that never belongs in an export either. */
export const DEVICE_ONLY_KEYS: ReadonlySet<string> = new Set([SYNC_META_KEY, ACCOUNT_KEY])
