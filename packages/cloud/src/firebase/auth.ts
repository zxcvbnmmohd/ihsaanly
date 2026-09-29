// Only types from 'firebase/auth': the extension must never load that entry
// (it pulls in popup and iframe code MV3 forbids), so everything here goes
// through methods on the Auth and User instances the flow created.
import type { Auth, User, UserCredential } from 'firebase/auth'
import type { Account, AuthService, SignInProvider } from '../ports'

/** The platform-specific part: how a provider's credential is obtained. */
export interface SignInFlow {
  signIn: (auth: Auth, provider: SignInProvider) => Promise<UserCredential>
  reauthenticate: (user: User, provider: SignInProvider) => Promise<void>
  /** Revokes provider tokens on account deletion (Apple requires it on iOS). */
  revoke?: (auth: Auth, provider: SignInProvider) => Promise<void>
}

/** Apple if any linked provider is Apple; Google otherwise — the only two we offer. */
function providerOf(user: User): SignInProvider {
  return user.providerData.some((info) => info.providerId === 'apple.com') ? 'apple' : 'google'
}

export function toAccount(user: User): Account {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    provider: providerOf(user),
  }
}

export function createFirebaseAuth(auth: Auth, flow: SignInFlow): AuthService {
  return {
    current: () => (auth.currentUser ? toAccount(auth.currentUser) : null),
    onChange: (listener) =>
      auth.onAuthStateChanged((user) => listener(user ? toAccount(user) : null)),
    signIn: async (provider) => toAccount((await flow.signIn(auth, provider)).user),
    signOut: () => auth.signOut(),
    deleteAccount: async (erase) => {
      const user = auth.currentUser
      if (!user) throw new Error('not-signed-in')
      const provider = providerOf(user)
      // Fresh credentials first: deleteUser refuses a stale session, and
      // finding that out after the data is gone would strand the account.
      await flow.reauthenticate(user, provider)
      await erase(user.uid)
      await flow.revoke?.(auth, provider)
      await user.delete()
    },
  }
}
