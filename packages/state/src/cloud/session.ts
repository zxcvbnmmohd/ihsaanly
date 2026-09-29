import { adoptAccount, syncOnce } from '@ihsaanly/cloud/engine'
import type { Account, Cloud, SignInProvider } from '@ihsaanly/cloud/ports'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'

import { readPreferenceRow, wipe, writePreferenceRow } from '../storage/backend'
import { noteFailure, reloadEvents } from '../storage/events'
import { onLocalWrite } from '../storage/local-writes'
import { reloadPreferences } from '../storage/preference-store'
import { ACCOUNT_KEY, SYNCED_KEYS } from './keys'
import { createLocalStore, readSyncMeta } from './local-store'

export type AccountStatus = 'signed-out' | 'syncing' | 'idle' | 'error' | 'account-mismatch'

export interface AccountState {
  status: AccountStatus
  account: Account | null
  lastSyncedAt: number | null
  error: string | null
  /** With `account-mismatch`: the account this device's data already belongs to. */
  mismatchUid?: string
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
}

const SIGNED_OUT: AccountState = {
  status: 'signed-out',
  account: null,
  lastSyncedAt: null,
  error: null,
}

const AccountFlag = z.object({ signedIn: z.boolean() })

let state: AccountState = SIGNED_OUT
const listeners = new Set<() => void>()

let loader: (() => Promise<Cloud>) | null = null
let cloud: Promise<Cloud> | null = null
let options: CloudOptions = {}
let stopListening: (() => void) | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let running: Promise<void> | null = null
let rerun = false

const local = createLocalStore()

function setState(next: Partial<AccountState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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
    setState({ ...SIGNED_OUT })
    return
  }

  const changed = state.account?.uid !== account.uid
  rememberSignedIn(true)
  setState({ account, lastSyncedAt: readSyncMeta().lastSyncedAt })
  if (changed) void runSync()
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
    }
  } catch (error) {
    noteFailure('cloudSync', error)
    setState({ status: 'error', error: describe(error) })
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
  if (preferenceKey !== null && !SYNCED_KEYS.has(preferenceKey)) return

  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    debounce = null
    void runSync()
  }, options.debounceMs ?? 5_000)
}

/** Every store refreshed in place after a wipe, then the app's own hook. */
function wipeLocal(): void {
  wipe()
  reloadPreferences()
  reloadEvents()
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
      setState({ status: 'error', error: describe(error) })
    })
  }

  return (): void => {
    unsubscribeWrites()
    stopListening?.()
    stopListening = null
    if (debounce) clearTimeout(debounce)
    debounce = null
    loader = null
    cloud = null
    running = null
    rerun = false
    state = SIGNED_OUT
    listeners.forEach((listener) => listener())
  }
}

export async function signIn(provider: SignInProvider): Promise<void> {
  try {
    const { auth } = await ensureCloud()
    setState({ status: 'syncing', error: null })
    handleAccount(await auth.signIn(provider))
  } catch (error) {
    noteFailure('cloudSignIn', error)
    setState({ status: state.account ? 'error' : 'signed-out', error: describe(error) })
  }
}

export function syncNow(): Promise<void> {
  return state.account ? runSync() : Promise.resolve()
}

/** For apps to call when they come to the foreground or a popup opens. */
export function notifyForeground(): void {
  if (state.account) void runSync()
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
    setState({ status: 'error', error: 'Could not reach your account, so nothing was removed.' })
    return
  }

  try {
    const { auth } = await ensureCloud()
    await auth.signOut()
  } catch (error) {
    noteFailure('cloudSignOut', error)
    setState({ status: 'error', error: describe(error) })
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
  try {
    const { auth, remote } = await ensureCloud()
    await auth.deleteAccount((uid) => remote.erase(uid))
  } catch (error) {
    noteFailure('cloudDeleteAccount', error)
    setState({ status: 'error', error: describe(error) })
    return
  }

  rememberSignedIn(false)
  setState({ ...SIGNED_OUT })
  if (mode === 'remove') {
    wipeLocal()
    options.onWiped?.()
  } else {
    local.resetSynced()
    local.writeMeta({ boundUid: null, cursor: null, lastSyncedAt: null })
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
