// The optional account. Everything Firebase-related is behind the dynamic import in
// `loadCloud`, so a build without config (or a popup nobody signed in on) never
// loads it. The background service worker must not import this file.
import { firebaseConfigFrom } from '@ihsaanly/cloud/config'
import type { Cloud } from '@ihsaanly/cloud/ports'

const config = firebaseConfigFrom({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
})
const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim()

export const cloudEnabled = config !== null && Boolean(clientId)

/** Google sign-in through Chrome's identity API: an OAuth implicit flow whose token Firebase exchanges. */
async function getGoogleAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId ?? '',
    response_type: 'token',
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: 'openid email profile',
  })
  const redirect = await chrome.identity.launchWebAuthFlow({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    interactive: true,
  })
  if (!redirect) throw new Error('Google sign-in was cancelled')
  const token = new URLSearchParams(new URL(redirect).hash.slice(1)).get('access_token')
  if (!token) throw new Error('Google sign-in returned no access token')
  return token
}

export function loadCloud(): Promise<Cloud> {
  if (!config) return Promise.reject(new Error('Cloud is not configured'))
  return import('@ihsaanly/cloud/firebase/flows/extension').then((m) =>
    m.createExtensionCloud(config, { getGoogleAccessToken }),
  )
}
