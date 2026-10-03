import { adoptAccount, applyRemoteChanges, freshMeta, syncOnce } from '@ihsaanly/cloud/engine'
import {
  type Account,
  type Cloud,
  LinkRequiredError,
  type RemoteChanges,
  type SignInProvider,
  type SyncRemote,
  type Unsubscribe,
} from '@ihsaanly/cloud/ports'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { flushOutbox, resetFeedbackState } from '../feedback/outbox'
import { readPreferenceRow, wipe, writePreferenceRow } from '../storage/backend'
import { noteFailure, reloadEvents } from '../storage/events'
import { onLocalWrite } from '../storage/local-writes'
import { forgetFailures } from '../storage/log'
import { reloadPreferences } from '../storage/preference-store'
import { codeOf, isNetworkError, messageOf } from './errors'
import { ACCOUNT_KEY, isProgressKey, isSyncedKey } from './keys'
import { createLocalStore, readSyncMeta } from './local-store'

export type AccountStatus =
  | 'signed-out'
  | 'syncing'
  | 'idle'
  | 'error'
  | 'account-mismatch'
  | 'link-required'

/**
 * What went wrong, as a code the screen turns into its own sentence. The raw
 * error goes to `noteFailure`, never to the UI: provider and SDK messages are
 * English, technical, and sometimes carry identifiers.
 */
export type AccountErrorCode =
  | 'network'
  | 'auth'
  | 'sync'
  | 'unknown'
  | 'remove-blocked'
  /** The Apple or Google identity being linked already opens a different account. */
  | 'link-conflict'
  /** Deleting needs a sign-in this surface cannot offer (Apple, in the extension). */
  | 'reauth-unavailable'

/**
 * A sign-in stopped because the email already has an account on the other
 * provider: signing in with `existing` opens it and links `attempted`.
 */
export interface LinkPrompt {
  existing: SignInProvider
  attempted: SignInProvider
}

export interface AccountState {
  status: AccountStatus
  account: Account | null
  lastSyncedAt: number | null
  error: AccountErrorCode | null
  /** With `account-mismatch`: the account this device's data already belongs to. */
  mismatchUid?: string
  /** With `link-required` (and while its sign-in runs): which provider to use. */
  link?: LinkPrompt
}

export interface CloudOptions {
  /**
   * After local data is wiped (signing out or deleting with `remove`). Every
   * store is already refreshed in place; an app that keeps other state in
   * memory reloads itself here, as the Data screen does after its own wipe.
   */
  onWiped?: () => void
  /** How long local writes settle before they are pushed. */
  debounceMs?: number
  /**
   * The same for item progress, shorter so the count follows you to another
   * device within seconds. A pending slower push is brought forward with it.
   */
  progressDebounceMs?: number
}

const SIGNED_OUT: AccountState = {
  status: 'signed-out',
  account: null,
  lastSyncedAt: null,
  error: null,
  mismatchUid: undefined,
  link: undefined,
}

const AccountFlag = z.object({ signedIn: z.boolean() })

let state: AccountState = SIGNED_OUT
const listeners = new Set<() => void>()

let loader: (() => Promise<Cloud>) | null = null
let cloud: Promise<Cloud> | null = null
let options: CloudOptions = {}
let stopListening: (() => void) | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
/** Whether the pending debounce is the short (progress) one. */
let debounceFast = false
let running: Promise<void> | null = null
let rerun = false
/** Apps launch in the foreground; `notifyBackground` says otherwise. */
let foreground = true
/** The live listener on the account, while one is attached. */
let unwatch: Unsubscribe | null = null

const local = createLocalStore()

function setState(next: Partial<AccountState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/**
 * The person closed the sheet or the popup. Not a failure: they changed their
 * mind, and the screen should look exactly as it did before they tapped.
 */
const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
  'ERR_REQUEST_CANCELED', // expo-apple-authentication
  'ERR_CANCELED',
  'SIGN_IN_CANCELLED', // @react-native-google-signin
  '12501', // Google Sign-In on Android: SIGN_IN_CANCELLED
  'cancelled',
])

export function isCancelled(error: unknown): boolean {
  if (CANCELLED_CODES.has(codeOf(error))) return true
  const message = messageOf(error)
  // chrome.identity.launchWebAuthFlow when the window is closed or access declined.
  return (
    message.includes('The user did not approve access') || message.includes('sign-in was cancelled')
  )
}

function classify(error: unknown, fallback: AccountErrorCode): AccountErrorCode {
  const code = codeOf(error)
  if (isNetworkError(error)) return 'network'
  if (code === 'link-conflict' || code === 'reauth-unavailable') return code
  if (code.startsWith('auth/')) return 'auth'
  return fallback
}

/** Straight to the backend: device bookkeeping, never a change worth pushing. */
function signedInBefore(): boolean {
  const row = readPreferenceRow(ACCOUNT_KEY)
  if (!row) return false
  try {
    return AccountFlag.safeParse(JSON.parse(row.value)).data?.signedIn === true
  } catch {
    return false
  }
}

function rememberSignedIn(signedIn: boolean): void {
  writePreferenceRow(ACCOUNT_KEY, JSON.stringify({ signedIn }))
}

/**
 * The only place the cloud code (and so Firebase) is loaded. Nothing calls it
 * until someone has signed in on this device or is signing in now, so a
 * local-only user never downloads or runs any of it.
 */
function ensureCloud(): Promise<Cloud> {
  if (!loader) return Promise.reject(new Error('startCloud has not been called'))
  const load = loader

  if (cloud) return cloud

  const loading = load().then((loaded) => {
    stopListening = loaded.auth.onChange(handleAccount)
    return loaded
  })
  cloud = loading
  // A failed load (offline on the first sign-in) is retried by the next call.
  loading.catch(() => {
    if (cloud === loading) cloud = null
  })
  return loading
}

function handleAccount(account: Account | null): void {
  if (!account) {
    // Signed out elsewhere, or the session did not survive: back to local-only.
    if (signedInBefore()) rememberSignedIn(false)
    stopWatch()
    setState({ ...SIGNED_OUT })
    return
  }

  const changed = state.account?.uid !== account.uid
  if (changed) stopWatch()
  rememberSignedIn(true)
  setState({ account, lastSyncedAt: readSyncMeta().lastSyncedAt })
  if (changed) {
    void runSync()
    // Signing in and a restored session both land here: feedback queued
    // while signed out or offline goes now.
    void flushFeedback()
  }
}

async function syncRound(): Promise<void> {
  const account = state.account
  if (!account) return

  setState({ status: 'syncing', error: null })
  try {
    const { remote } = await ensureCloud()
    const outcome = await syncOnce(local, remote, account.uid)
    if (state.account?.uid !== account.uid) return

    if (outcome.status === 'account-mismatch') {
      setState({ status: 'account-mismatch', mismatchUid: outcome.boundUid })
    } else {
      setState({
        status: 'idle',
        lastSyncedAt: readSyncMeta().lastSyncedAt,
        mismatchUid: undefined,
      })
      startWatch(remote, account.uid)
    }
  } catch (error) {
    noteFailure('cloudSync', error)
    setState({ status: 'error', error: classify(error, 'sync') })
  }
}

/**
 * One sync in flight at a time. A request that arrives mid-sync is folded into
 * a single rerun afterwards, so nothing written during the sync is left
 * waiting for the next trigger.
 */
function runSync(): Promise<void> {
  if (running !== null) {
    rerun = true
    return running
  }

  running = (async (): Promise<void> => {
    do {
      rerun = false
      await syncRound()
    } while (rerun)
  })().finally(() => {
    running = null
  })
  return running
}

function scheduleSync(preferenceKey: string | null): void {
  if (!state.account) return
  if (preferenceKey !== null && !isSyncedKey(preferenceKey)) return

  const fast = preferenceKey !== null && isProgressKey(preferenceKey)
  // A progress push is already due sooner; it carries this write too.
  if (!fast && debounce && debounceFast) return
  if (debounce) clearTimeout(debounce)
  debounceFast = fast
  debounce = setTimeout(
    () => {
      debounce = null
      void runSync()
    },
    fast ? (options.progressDebounceMs ?? 1_000) : (options.debounceMs ?? 5_000),
  )
}

/**
 * Listens for the account's changes while the app is in front, after a
 * successful round (so the cursor is current and the device is bound). What
 * arrives is applied straight away, without a pull: the listener already
 * paid for the read.
 */
function startWatch(remote: SyncRemote, uid: string): void {
  if (!foreground || unwatch || !remote.watch || state.account?.uid !== uid) return
  unwatch = remote.watch(
    uid,
    readSyncMeta().cursor,
    (changes) => void applyWatched(uid, changes),
    (error) => {
      // The listener is gone; the next foreground (or round) attaches another.
      noteFailure('cloudWatch', error)
      unwatch = null
    },
  )
}

function stopWatch(): void {
  unwatch?.()
  unwatch = null
}

async function applyWatched(uid: string, changes: RemoteChanges): Promise<void> {
  // Never mid-round: the round writes the meta this reads and moves. Always
  // after the listener is in place, even for a first snapshot delivered at once.
  await running
  while (running !== null) await running
  if (state.account?.uid !== uid || !unwatch) return
  try {
    const { pending } = applyRemoteChanges(local, changes)
    // A merge produced something the account lacks: push it soon.
    if (pending) scheduleSync(null)
  } catch (error) {
    noteFailure('cloudWatchApply', error)
  }
}

/** Every store refreshed in place after a wipe, then the app's own hook. */
function wipeLocal(): void {
  wipe()
  reloadPreferences()
  forgetFailures()
  reloadEvents()
  resetFeedbackState()
}

/**
 * Wires sync up once, at launch. Loads the cloud only if someone signed in on
 * this device before; otherwise nothing happens until `signIn`. Returns a stop
 * function (tests, hot reload).
 */
export function startCloud(load: () => Promise<Cloud>, opts: CloudOptions = {}): () => void {
  loader = load
  options = opts
  const unsubscribeWrites = onLocalWrite(scheduleSync)

  if (signedInBefore()) {
    setState({ lastSyncedAt: readSyncMeta().lastSyncedAt })
    ensureCloud().catch((error: unknown) => {
      noteFailure('cloudLoad', error)
      setState({ status: 'error', error: classify(error, 'unknown') })
    })
  }

  return (): void => {
    unsubscribeWrites()
    stopListening?.()
    stopListening = null
    if (debounce) clearTimeout(debounce)
    debounce = null
    debounceFast = false
    stopWatch()
    foreground = true
    loader = null
    cloud = null
    running = null
    rerun = false
    state = SIGNED_OUT
    listeners.forEach((listener) => listener())
  }
}

/** Where a sign-in that did not finish leaves the screen. */
function settledStatus(): AccountStatus {
  if (state.account) return 'idle'
  return state.link ? 'link-required' : 'signed-out'
}

export async function signIn(provider: SignInProvider): Promise<void> {
  try {
    const { auth } = await ensureCloud()
    setState({ status: 'syncing', error: null })
    const account = await auth.signIn(provider)
    setState({ link: undefined })
    handleAccount(account)
  } catch (error) {
    if (error instanceof LinkRequiredError) {
      // Not a failure: the next step is signing in with the provider the account has.
      setState({
        status: 'link-required',
        error: null,
        link: { existing: error.existing, attempted: error.attempted },
      })
      return
    }
    if (isCancelled(error)) {
      setState({ status: settledStatus(), error: null })
      return
    }
    noteFailure('cloudSignIn', error)
    setState({
      status: state.account ? 'error' : settledStatus(),
      error: classify(error, 'auth'),
    })
  }
}

/**
 * Leaves `link-required` without signing in. Signing the auth service out
 * too makes it forget the sign-in it was holding to link.
 */
export async function cancelLink(): Promise<void> {
  if (state.status !== 'link-required' && !state.link) return
  setState({ status: state.account ? 'idle' : 'signed-out', link: undefined, error: null })
  if (state.account || !cloud) return
  try {
    const { auth } = await cloud
    await auth.signOut()
  } catch (error) {
    noteFailure('cloudCancelLink', error)
  }
}

/** Adds another sign-in method to the signed-in account. */
export async function linkProvider(provider: SignInProvider): Promise<void> {
  if (!state.account) return
  try {
    const { auth } = await ensureCloud()
    const account = await auth.link(provider)
    if (state.account?.uid !== account.uid) return
    setState({
      account,
      error: null,
      status: state.status === 'error' ? 'idle' : state.status,
    })
  } catch (error) {
    if (isCancelled(error)) return
    noteFailure('cloudLink', error)
    setState({ status: 'error', error: classify(error, 'auth') })
  }
}

export function syncNow(): Promise<void> {
  return state.account ? runSync() : Promise.resolve()
}

/**
 * How soon after a successful sync coming to the foreground syncs again.
 * Switching apps back and forth should not cost a read each time; local
 * writes still push after their debounce, and `syncNow` is never held back.
 */
export const FOREGROUND_SYNC_INTERVAL_MS = 2 * 60_000

/**
 * For apps to call when they come to the foreground or a popup opens. While
 * the live listener is attached nothing more is needed. Otherwise it syncs,
 * unless the last successful round was within `FOREGROUND_SYNC_INTERVAL_MS`
 * (persisted, so a reopened popup counts it too), and attaches the listener
 * again — from the cursor, so it catches up on what it missed meanwhile.
 * Feedback is flushed either way.
 */
export function notifyForeground(): void {
  foreground = true
  if (!state.account) return
  if (!unwatch) {
    const last = readSyncMeta().lastSyncedAt
    const since = last === null ? null : Date.now() - last
    // A clock that went backwards (since < 0) does not hold sync back.
    if (since === null || since < 0 || since >= FOREGROUND_SYNC_INTERVAL_MS) void runSync()
    else void watchAgain()
  }
  void flushFeedback()
}

/** Throttled foreground: no round, just the listener back on (if the device is settled). */
async function watchAgain(): Promise<void> {
  const account = state.account
  if (!account || state.status !== 'idle') return
  // Signed in means the cloud has loaded: this resolves at once.
  startWatch((await ensureCloud()).remote, account.uid)
}

/**
 * For apps to call when they go to the background, or a tab is hidden: the
 * live listener is detached, so a device nobody is looking at reads nothing.
 * Local writes still push after their debounce.
 */
export function notifyBackground(): void {
  foreground = false
  stopWatch()
}

/**
 * Sends whatever feedback is queued for the signed-in account. Signed out, it
 * stays queued. Called on sign-in, restore and foreground, and by the screen.
 */
export function flushFeedback(): Promise<void> {
  const account = state.account
  if (!account) return Promise.resolve()
  return flushOutbox(async () => (await ensureCloud()).feedback, account.uid)
}

/**
 * `keep` leaves this device's data in place, still bound to the account, so
 * signing back in carries on and signing into another one asks first.
 * `remove` erases it — but only after a final sync succeeds, so nothing
 * recorded since the last one is lost with it.
 */
export async function signOut(mode: 'keep' | 'remove'): Promise<void> {
  if (!state.account) return

  await runSync()
  if (mode === 'remove' && state.status !== 'idle') {
    setState({ status: 'error', error: 'remove-blocked' })
    return
  }

  stopWatch()
  try {
    const { auth } = await ensureCloud()
    await auth.signOut()
  } catch (error) {
    noteFailure('cloudSignOut', error)
    setState({ status: 'error', error: classify(error, 'unknown') })
    return
  }

  rememberSignedIn(false)
  setState({ ...SIGNED_OUT })
  if (mode === 'remove') {
    wipeLocal()
    options.onWiped?.()
  }
}

/**
 * Settles `account-mismatch`. `merge` pushes this device's whole log into the
 * signed-in account; `fresh` erases this device first and takes the account's.
 */
export async function resolveMismatch(mode: 'merge' | 'fresh'): Promise<void> {
  const account = state.account
  if (!account) return

  await running
  stopWatch()
  if (mode === 'fresh') {
    wipeLocal()
    rememberSignedIn(true)
  }
  adoptAccount(local, account.uid, mode)
  setState({ status: 'idle', mismatchUid: undefined })
  await runSync()
}

/**
 * Erases the account's cloud data, then the account. `keep` leaves this
 * device's data as a local-only copy, unbound, so a later sign-in merges it
 * without asking; `remove` erases it too.
 */
export async function deleteAccount(mode: 'keep' | 'remove'): Promise<void> {
  if (!state.account) return

  await running
  // The erase would otherwise reach the listener as deletions, then a denial.
  stopWatch()
  try {
    const { auth, remote } = await ensureCloud()
    await auth.deleteAccount((uid) => remote.erase(uid))
  } catch (error) {
    // Deleting asks the provider to confirm who you are; closing that is not a failure.
    if (isCancelled(error)) {
      void watchAgain()
      return
    }
    noteFailure('cloudDeleteAccount', error)
    setState({ status: 'error', error: classify(error, 'unknown') })
    return
  }

  rememberSignedIn(false)
  setState({ ...SIGNED_OUT })
  if (mode === 'remove') {
    wipeLocal()
    options.onWiped?.()
  } else {
    local.resetSynced()
    local.writeMeta(freshMeta(null))
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

function snapshot(): AccountState {
  return state
}

export function getAccountState(): AccountState {
  return state
}

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, snapshot)
}
