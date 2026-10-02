// Only types from 'firebase/auth': the extension must never load that entry
// (it pulls in popup and iframe code MV3 forbids), so everything here goes
// through methods on the Auth and User instances, or through the flow, which
// imports the functions from the entry its platform is allowed.
import type { Auth, AuthCredential, User, UserCredential } from 'firebase/auth'
import {
  type Account,
  type AuthService,
  LinkConflictError,
  LinkRequiredError,
  otherProvider,
  ReauthUnavailableError,
  type SignInProvider,
} from '../ports'

/** The platform-specific part: how a provider's credential is obtained and used. */
export interface SignInFlow {
  signIn: (auth: Auth, provider: SignInProvider) => Promise<UserCredential>
  /** Adds `provider` to the signed-in user: a popup on the web, a native sheet otherwise. */
  link: (user: User, provider: SignInProvider) => Promise<UserCredential>
  /** `linkWithCredential`, from whichever entry this platform may load. */
  linkCredential: (user: User, credential: AuthCredential) => Promise<UserCredential>
  /**
   * The credential a sign-in that failed with
   * `auth/account-exists-with-different-credential` tried to use, so it can be
   * linked once the person signs in with the provider the account already has.
   */
  pendingCredential: (error: unknown, provider: SignInProvider) => AuthCredential | null
  /** Whether `provider` can sign in (and so re-authenticate) on this platform. */
  available: (provider: SignInProvider) => Promise<boolean>
  reauthenticate: (user: User, provider: SignInProvider) => Promise<void>
  /** Revokes provider tokens on account deletion (Apple requires it on iOS). */
  revoke?: (auth: Auth, provider: SignInProvider) => Promise<void>
}

const PROVIDER_IDS: Record<SignInProvider, string> = { apple: 'apple.com', google: 'google.com' }
/** Apple first, so `Account.provider` reads as it did before linking existed. */
const ORDER: SignInProvider[] = ['apple', 'google']

function providersOf(user: User): SignInProvider[] {
  const ids = new Set(user.providerData.map((info) => info.providerId))
  return ORDER.filter((provider) => ids.has(PROVIDER_IDS[provider]))
}

export function toAccount(user: User): Account {
  const providers = providersOf(user)
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    provider: providers[0] ?? 'google',
    providers,
  }
}

function codeOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown }
    if (typeof code === 'string') return code
  }
  return ''
}

/** AuthError.customData.email, read structurally: the error is `unknown` here. */
function emailOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('customData' in error)) return null
  const { customData } = error as { customData?: { email?: unknown } }
  return typeof customData?.email === 'string' ? customData.email : null
}

interface Pending {
  credential: AuthCredential
  attempted: SignInProvider
}

export function createFirebaseAuth(auth: Auth, flow: SignInFlow): AuthService {
  // Held in memory only: a credential is short-lived and never worth persisting.
  let pending: Pending | null = null

  const signedIn = (): User => {
    const user = auth.currentUser
    if (!user) throw new Error('not-signed-in')
    return user
  }

  return {
    current: () => (auth.currentUser ? toAccount(auth.currentUser) : null),
    onChange: (listener) =>
      auth.onAuthStateChanged((user) => listener(user ? toAccount(user) : null)),

    signIn: async (provider) => {
      let result: UserCredential
      try {
        result = await flow.signIn(auth, provider)
      } catch (error) {
        if (codeOf(error) !== 'auth/account-exists-with-different-credential') throw error
        const credential = flow.pendingCredential(error, provider)
        pending = credential ? { credential, attempted: provider } : null
        // Only two providers exist, so the account has the other one.
        throw new LinkRequiredError(otherProvider(provider), provider, emailOf(error))
      }

      const waiting = pending
      pending = null
      if (waiting && waiting.attempted !== provider) {
        try {
          await flow.linkCredential(result.user, waiting.credential)
        } catch {
          // Signed in either way, so nothing is rethrown. An identity already
          // linked here (provider-already-linked) or opening another account
          // (credential-already-in-use) is left as it is; anything else, such
          // as an expired token, can be linked by hand under Sign-in methods.
        }
      }
      return toAccount(auth.currentUser ?? result.user)
    },

    link: async (provider) => {
      const user = signedIn()
      try {
        await flow.link(user, provider)
      } catch (error) {
        const code = codeOf(error)
        if (code === 'auth/provider-already-linked') return toAccount(auth.currentUser ?? user)
        // That identity (or its email, on the web) already opens another account.
        if (
          code === 'auth/credential-already-in-use' ||
          code === 'auth/account-exists-with-different-credential'
        )
          throw new LinkConflictError(provider)
        throw error
      }
      return toAccount(auth.currentUser ?? user)
    },

    signOut: async () => {
      pending = null
      await auth.signOut()
    },

    deleteAccount: async (erase) => {
      const user = signedIn()
      const linked = providersOf(user)
      let provider: SignInProvider | null = null
      for (const candidate of linked) {
        if (await flow.available(candidate)) {
          provider = candidate
          break
        }
      }
      if (!provider) throw new ReauthUnavailableError(linked)
      // Fresh credentials first: deleteUser refuses a stale session, and
      // finding that out after the data is gone would strand the account.
      await flow.reauthenticate(user, provider)
      await erase(user.uid)
      if (flow.revoke) for (const each of linked) await flow.revoke(auth, each)
      await user.delete()
    },
  }
}
