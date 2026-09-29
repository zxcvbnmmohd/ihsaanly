import type { Account, AuthService, SignInProvider } from '../ports'

/**
 * A fake AuthService: signing in just mints an account. The uid is stable per
 * provider unless `uid` is given, so a test can sign the "same" or a
 * "different" person in on purpose.
 */
export function createMemoryAuth(options: { uid?: string } = {}): AuthService {
  let account: Account | null = null
  const listeners = new Set<(account: Account | null) => void>()

  const set = (next: Account | null): void => {
    account = next
    for (const listener of [...listeners]) listener(next)
  }

  return {
    current: () => account,
    onChange: (listener) => {
      listeners.add(listener)
      listener(account)
      return () => {
        listeners.delete(listener)
      }
    },
    signIn: async (provider: SignInProvider) => {
      const next: Account = {
        uid: options.uid ?? `memory-${provider}`,
        email: `${provider}@example.test`,
        displayName: `Memory ${provider}`,
        provider,
      }
      set(next)
      return next
    },
    signOut: async () => {
      set(null)
    },
    deleteAccount: async (erase) => {
      if (!account) throw new Error('Not signed in')
      await erase(account.uid)
      set(null)
    },
  }
}
