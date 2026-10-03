// Replaces the cloud session's actions and its `useAccount` with recorders and
// a settable account, keeping everything else real. mock.module is process
// wide, so import this before the code under test and call `resetSession()`
// in a beforeEach.
import { mock } from 'bun:test'
import * as real from '@ihsaanly/state/cloud/session'

export const sessionCalls: { name: string; args: unknown[] }[] = []
export let startArgs: { load: () => Promise<unknown>; options: real.CloudOptions } | null = null
export let account: real.AccountState = real.getAccountState()

export function setAccount(next: Partial<real.AccountState>): void {
  account = { ...real.getAccountState(), ...next }
}

export function resetSession(): void {
  sessionCalls.length = 0
  startArgs = null
  account = real.getAccountState()
}

const record =
  (name: string): ((...args: unknown[]) => Promise<void>) =>
  async (...args) => {
    sessionCalls.push({ name, args })
  }

mock.module('@ihsaanly/state/cloud/session', () => ({
  ...real,
  useAccount: () => account,
  signIn: record('signIn'),
  syncNow: record('syncNow'),
  signOut: record('signOut'),
  resolveMismatch: record('resolveMismatch'),
  deleteAccount: record('deleteAccount'),
  linkProvider: record('linkProvider'),
  cancelLink: record('cancelLink'),
  startCloud: (load: () => Promise<unknown>, options: real.CloudOptions = {}) => {
    startArgs = { load, options }
    return () => {}
  },
}))
