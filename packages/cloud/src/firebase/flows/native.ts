import * as firebaseAuth from 'firebase/auth'
import {
  type Auth,
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  initializeAuth,
  type OAuthCredential,
  OAuthProvider,
  type Persistence,
  type ReactNativeAsyncStorage,
  reauthenticateWithCredential,
  signInWithCredential,
} from 'firebase/auth'
import type { Cloud, SignInProvider } from '../../ports'
import { AUTH_EMULATOR_PORT, type FirebaseConfig, firebaseApp, firestore } from '../app'
import { createFirebaseAuth, type SignInFlow } from '../auth'
import { createFirestoreSyncRemote } from '../sync-remote'

/**
 * Injected by the mobile app so this package has no Expo or RN dependency:
 * the native sign-in SDKs hand back ID tokens, and the key-value store keeps
 * the session across launches.
 */
export interface NativeDeps {
  storage: ReactNativeAsyncStorage
  appleIdToken: () => Promise<{ idToken: string; rawNonce: string }>
  googleIdToken: () => Promise<string>
}

/**
 * `getReactNativePersistence` exists only in the build Metro picks through
 * the `react-native` export condition; this package typechecks against the
 * browser types, which omit it. Read it off the namespace with its real
 * signature rather than widen the tsconfig for one symbol.
 */
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: ReactNativeAsyncStorage) => Persistence
}

export function nativeFlow(deps: NativeDeps): SignInFlow {
  const credential = async (provider: SignInProvider): Promise<OAuthCredential> => {
    if (provider === 'apple') {
      const { idToken, rawNonce } = await deps.appleIdToken()
      return new OAuthProvider('apple.com').credential({ idToken, rawNonce })
    }
    return GoogleAuthProvider.credential(await deps.googleIdToken())
  }
  return {
    signIn: async (auth, provider) => signInWithCredential(auth, await credential(provider)),
    reauthenticate: async (user, provider) => {
      await reauthenticateWithCredential(user, await credential(provider))
    },
  }
}

function nativeAuth(config: FirebaseConfig, storage: ReactNativeAsyncStorage): Auth {
  const app = firebaseApp(config)
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(storage) })
  } catch {
    return getAuth(app) // a Fast Refresh re-ran this module; the instance survives
  }
  if (config.emulatorHost) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:${AUTH_EMULATOR_PORT}`)
  }
  return auth
}

/** The provider swap point for the mobile app. */
export function createNativeCloud(config: FirebaseConfig, deps: NativeDeps): Cloud {
  return {
    auth: createFirebaseAuth(nativeAuth(config, deps.storage), nativeFlow(deps)),
    remote: createFirestoreSyncRemote(
      firestore(firebaseApp(config), { native: true, emulatorHost: config.emulatorHost }),
    ),
  }
}
