import type { RestoreOutcome } from '@ihsaanly/ui/types'

import { type Onboarding, useOnboarding } from '../onboarding/store'
import { type AccountState, useAccount } from './session'

export type { RestoreOutcome }

/**
 * What signing in from onboarding has led to, from the account state and the
 * onboarding preference as they stand now. The first sync applies the
 * account's preferences (and reloads every store) before it reports `idle`,
 * so by then `onboarding` already says whether that account finished setup.
 *
 * `lastSyncedAt` is what tells "the first sync finished" from "signed in, not
 * synced yet": it stays null until a round has completed.
 */
export function restoreOutcomeOf(account: AccountState, onboarding: Onboarding): RestoreOutcome {
  // Before an account exists, a running sign-in is the screen's own "Signing in…".
  if (!account.account) return 'idle'
  if (account.status === 'syncing') return 'restoring'
  if (account.status !== 'idle' || account.lastSyncedAt === null) return 'idle'
  return onboarding.completed ? 'restored' : 'needs-setup'
}

/**
 * The same decision as a hook, for the Account route when onboarding sent
 * someone there. Each app only maps the outcome to its own navigation.
 */
export function useRestoreOutcome(): RestoreOutcome {
  return restoreOutcomeOf(useAccount(), useOnboarding())
}
