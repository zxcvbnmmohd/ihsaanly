import {
  type AuthError,
  type AuthProvider,
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  OAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth'
import type { Cloud, SignInProvider } from '../../ports'
import { AUTH_EMULATOR_PORT, type FirebaseConfig, firebaseApp, firestore } from '../app'
import { createFirebaseAuth, type SignInFlow } from '../auth'
import { createFirestoreFeedback } from '../feedback'
import { createFirestoreSyncRemote } from '../sync-remote'

function providerFor(provider: SignInProvider): AuthProvider {
  return provider === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider()
}

export const webFlow: SignInFlow = {
  signIn: (auth, provider) => signInWithPopup(auth, providerFor(provider)),
  link: (user, provider) => linkWithPopup(user, providerFor(provider)),
  linkCredential: linkWithCredential,
  // The popup's credential comes back on the error, not from anything we built.
  pendingCredential: (error, provider) =>
    provider === 'apple'
      ? OAuthProvider.credentialFromError(error as AuthError)
      : GoogleAuthProvider.credentialFromError(error as AuthError),
  available: async () => true,
  reauthenticate: async (user, provider) => {
    await reauthenticateWithPopup(user, providerFor(provider))
  },
}

/** The provider swap point for the web app. */
export function createWebCloud(config: FirebaseConfig): Cloud {
  const app = firebaseApp(config)
  const auth = getAuth(app)
  if (config.emulatorHost && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:${AUTH_EMULATOR_PORT}`)
  }
  const db = firestore(app, { native: false, emulatorHost: config.emulatorHost })
  return {
    auth: createFirebaseAuth(auth, webFlow),
    remote: createFirestoreSyncRemote(db),
    feedback: createFirestoreFeedback(db),
  }
}
