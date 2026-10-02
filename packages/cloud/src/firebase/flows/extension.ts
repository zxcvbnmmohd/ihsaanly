// 'firebase/auth/web-extension', never 'firebase/auth': the default entry
// carries popup/redirect code that loads remote scripts, which MV3 rejects.
import {
  type Auth,
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  linkWithCredential,
  type OAuthCredential,
  reauthenticateWithCredential,
  signInWithCredential,
} from 'firebase/auth/web-extension'
import type { Cloud, SignInProvider } from '../../ports'
import { AUTH_EMULATOR_PORT, type FirebaseConfig, firebaseApp, firestore } from '../app'
import { createFirebaseAuth, type SignInFlow } from '../auth'
import { createFirestoreSyncRemote } from '../sync-remote'

export interface ExtensionDeps {
  /** From chrome.identity.getAuthToken, owned by the extension app. */
  getGoogleAccessToken: () => Promise<string>
}

function googleOnly(provider: SignInProvider): void {
  // No Apple equivalent of chrome.identity; the extension UI hides the button.
  if (provider === 'apple') throw new Error('apple-unsupported')
}

export function extensionFlow(deps: ExtensionDeps): SignInFlow {
  const credential = async (): Promise<OAuthCredential> =>
    GoogleAuthProvider.credential(null, await deps.getGoogleAccessToken())
  // The credential the last sign-in built, kept for linking (see SignInFlow).
  let last: OAuthCredential | null = null
  return {
    signIn: async (auth, provider) => {
      googleOnly(provider)
      last = null
      last = await credential()
      return signInWithCredential(auth, last)
    },
    link: async (user, provider) => {
      googleOnly(provider)
      return linkWithCredential(user, await credential())
    },
    // Only ever a credential this flow built, typed by the other entry's declarations.
    linkCredential: (user, pending) => linkWithCredential(user, pending as OAuthCredential),
    pendingCredential: () => last,
    available: async (provider) => provider === 'google',
    reauthenticate: async (user, provider) => {
      googleOnly(provider)
      await reauthenticateWithCredential(user, await credential())
    },
  }
}

function extensionAuth(config: FirebaseConfig): Auth {
  const app = firebaseApp(config)
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: indexedDBLocalPersistence })
  } catch {
    return getAuth(app) // already initialized by an earlier load of this module
  }
  if (config.emulatorHost) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:${AUTH_EMULATOR_PORT}`)
  }
  return auth
}

/** The provider swap point for the browser extension. */
export function createExtensionCloud(config: FirebaseConfig, deps: ExtensionDeps): Cloud {
  return {
    auth: createFirebaseAuth(extensionAuth(config), extensionFlow(deps)),
    remote: createFirestoreSyncRemote(
      firestore(firebaseApp(config), { native: false, emulatorHost: config.emulatorHost }),
    ),
  }
}
