import {
  type Account,
  type AuthService,
  LinkConflictError,
  LinkRequiredError,
  ReauthUnavailableError,
  type SignInProvider,
} from '../ports'

export interface MemoryAuthOptions {
  /** The uid of the first account created; later ones get a suffix. */
  uid?: string
  /**
   * The email each provider reports. By default they differ, so Apple and
   * Google are two people; give both the same one to model one person.
   */
  emails?: Partial<Record<SignInProvider, string>>
  /** Accounts that exist before the test starts. */
  seed?: { uid: string; email: string; providers: SignInProvider[] }[]
  /** Providers this "platform" can sign in with; the extension has only Google. */
  available?: SignInProvider[]
}

interface Stored {
  uid: string
  email: string
  displayName: string
  providers: SignInProvider[]
}

const ORDER: SignInProvider[] = ['apple', 'google']

/** An Apple or Google identity: the provider and the email it reports. */
const identity = (provider: SignInProvider, email: string): string => `${provider}|${email}`

/**
 * A fake AuthService that behaves like Firebase with one account per email:
 * an identity opens exactly one account; signing in with the other provider
 * for an email that already has an account rejects with `LinkRequiredError`
 * until the existing provider signs in, which links it; and linking an
 * identity another account owns is a `LinkConflictError`.
 */
export function createMemoryAuth(options: MemoryAuthOptions = {}): AuthService {
  const accounts = new Map<string, Stored>()
  /** identity → uid */
  const identities = new Map<string, string>()
  const available = options.available ?? ORDER
  let current: Stored | null = null
  let pending: { provider: SignInProvider; email: string } | null = null
  const listeners = new Set<(account: Account | null) => void>()

  const emailFor = (provider: SignInProvider): string =>
    options.emails?.[provider] ?? `${provider}@example.test`

  const attach = (stored: Stored, provider: SignInProvider, email: string): void => {
    if (!stored.providers.includes(provider)) stored.providers.push(provider)
    identities.set(identity(provider, email), stored.uid)
  }

  for (const seeded of options.seed ?? []) {
    const stored: Stored = { ...seeded, displayName: 'Memory', providers: [] }
    accounts.set(stored.uid, stored)
    for (const provider of seeded.providers) attach(stored, provider, seeded.email)
  }

  const toAccount = (stored: Stored): Account => {
    const providers = ORDER.filter((provider) => stored.providers.includes(provider))
    return {
      uid: stored.uid,
      email: stored.email,
      displayName: stored.displayName,
      provider: providers[0] ?? 'google',
      providers,
    }
  }

  const freshUid = (provider: SignInProvider): string => {
    const base = options.uid ?? `memory-${provider}`
    let uid = base
    for (let n = 2; accounts.has(uid); n += 1) uid = `${base}-${n}`
    return uid
  }

  const set = (next: Stored | null): void => {
    current = next
    const account = next ? toAccount(next) : null
    for (const listener of [...listeners]) listener(account)
  }

  const signedIn = (): Stored => {
    if (!current) throw new Error('Not signed in')
    return current
  }

  return {
    current: () => (current ? toAccount(current) : null),
    onChange: (listener) => {
      listeners.add(listener)
      listener(current ? toAccount(current) : null)
      return () => {
        listeners.delete(listener)
      }
    },
    signIn: async (provider) => {
      const email = emailFor(provider)
      const uid = identities.get(identity(provider, email))
      let stored = uid === undefined ? undefined : accounts.get(uid)
      if (!stored) {
        const sameEmail = [...accounts.values()].find((each) => each.email === email)
        if (sameEmail) {
          pending = { provider, email }
          throw new LinkRequiredError(toAccount(sameEmail).provider, provider, email)
        }
        stored = {
          uid: freshUid(provider),
          email,
          displayName: `Memory ${provider}`,
          providers: [],
        }
        accounts.set(stored.uid, stored)
        attach(stored, provider, email)
      }

      const waiting = pending
      pending = null
      // Like Firebase: an identity some account already owns is left alone.
      if (
        waiting &&
        waiting.provider !== provider &&
        !identities.has(identity(waiting.provider, waiting.email))
      )
        attach(stored, waiting.provider, waiting.email)

      set(stored)
      return toAccount(stored)
    },
    link: async (provider) => {
      const stored = signedIn()
      const email = emailFor(provider)
      const holder = identities.get(identity(provider, email))
      if (holder !== undefined && holder !== stored.uid) throw new LinkConflictError(provider)
      attach(stored, provider, email)
      return toAccount(stored)
    },
    signOut: async () => {
      pending = null
      set(null)
    },
    deleteAccount: async (erase) => {
      const stored = signedIn()
      if (!stored.providers.some((provider) => available.includes(provider)))
        throw new ReauthUnavailableError(toAccount(stored).providers)
      await erase(stored.uid)
      accounts.delete(stored.uid)
      for (const [key, uid] of identities) if (uid === stored.uid) identities.delete(key)
      set(null)
    },
  }
}
