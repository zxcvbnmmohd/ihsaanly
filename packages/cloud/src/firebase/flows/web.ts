import {
  type AuthProvider,
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  OAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth'
import type { Cloud, SignInProvider } from '../../ports'
import { AUTH_EMULATOR_PORT, type FirebaseConfig, firebaseApp, firestore } from '../app'
import { createFirebaseAuth, type SignInFlow } from '../auth'
import { createFirestoreSyncRemote } from '../sync-remote'

function providerFor(provider: SignInProvider): AuthProvider {
  return provider === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider()
}

export const webFlow: SignInFlow = {
  signIn: (auth, provider) => signInWithPopup(auth, providerFor(provider)),
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
  return {
    auth: createFirebaseAuth(auth, webFlow),
    remote: createFirestoreSyncRemote(
      firestore(app, { native: false, emulatorHost: config.emulatorHost }),
    ),
  }
}
