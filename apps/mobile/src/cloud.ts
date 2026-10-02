import { firebaseConfigFrom } from '@ihsaanly/cloud/config'
import type { Cloud } from '@ihsaanly/cloud/ports'
import { startCloud } from '@ihsaanly/state/cloud/session'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { reloadAppAsync } from 'expo'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import Storage from 'expo-sqlite/kv-store'

// Expo inlines EXPO_PUBLIC_ variables only on a literal `process.env.NAME` read.
const config = firebaseConfigFrom({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  emulatorHost: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
})

/**
 * The published legal pages. Signing in agrees to the terms, so the Account
 * screen links both; About links them too, for everyone.
 */
export const LEGAL_URLS = {
  privacy: 'https://ihsaanly.app/legal/privacy',
  terms: 'https://ihsaanly.app/legal/terms',
  deleteAccount: 'https://ihsaanly.app/legal/delete-account',
} as const

/** False in a build without a Firebase config: no Account row, no sign-in, no SDK. */
export const cloudEnabled = config !== null

async function appleIdToken(): Promise<{ idToken: string; rawNonce: string }> {
  const rawNonce = Crypto.randomUUID()
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  })
  if (!credential.identityToken) throw new Error('Apple returned no identity token')
  return { idToken: credential.identityToken, rawNonce }
}

/** Recognised by the session as "they changed their mind", which is not an error. */
function cancelled(): Error {
  return Object.assign(new Error('Sign-in was cancelled'), { code: 'cancelled' })
}

let googleConfigured = false

async function googleIdToken(): Promise<string> {
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    })
    googleConfigured = true
  }
  await GoogleSignin.hasPlayServices()
  const response = await GoogleSignin.signIn()
  if (response.type !== 'success') throw cancelled()
  if (!response.data.idToken) throw new Error('Google returned no ID token')
  return response.data.idToken
}

async function loadCloud(): Promise<Cloud> {
  if (!config) throw new Error('Firebase is not configured')
  // Dynamic, so Firebase stays off the startup path.
  const { createNativeCloud } = await import('@ihsaanly/cloud/firebase/flows/native')
  return createNativeCloud(config, {
    storage: Storage,
    appleIdToken,
    googleIdToken,
    appleAvailable: () => AppleAuthentication.isAvailableAsync(),
  })
}

/** Starts sync once; returns the stop function. Call only when `cloudEnabled`. */
export function startMobileCloud(): () => void {
  return startCloud(loadCloud, { onWiped: () => void reloadAppAsync() })
}
