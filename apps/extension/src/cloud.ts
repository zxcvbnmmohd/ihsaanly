// The optional account. Everything Firebase-related is behind the dynamic import in
// `loadCloud`, so a build without config (or a popup nobody signed in on) never
// loads it. The background service worker must not import this file.
import { firebaseConfigFrom } from '@ihsaanly/cloud/config'
import type { Cloud } from '@ihsaanly/cloud/ports'

/** The build variables that switch the account on; all of them are needed. */
export interface CloudEnv {
  apiKey: string | undefined
  authDomain: string | undefined
  projectId: string | undefined
  appId: string | undefined
  emulatorHost: string | undefined
  googleClientId: string | undefined
}

interface CloudSetup {
  cloudEnabled: boolean
  loadCloud: () => Promise<Cloud>
}

export function cloudFor(env: CloudEnv): CloudSetup {
  const config = firebaseConfigFrom(env)
  const clientId = env.googleClientId?.trim()

  /** Google sign-in through Chrome's identity API: an OAuth implicit flow whose token Firebase exchanges. */
  const getGoogleAccessToken = async (): Promise<string> => {
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

  return {
    cloudEnabled: config !== null && Boolean(clientId),
    loadCloud: () => {
      if (!config) return Promise.reject(new Error('Cloud is not configured'))
      return import('@ihsaanly/cloud/firebase/flows/extension').then((m) =>
        m.createExtensionCloud(config, { getGoogleAccessToken }),
      )
    },
  }
}

export const { cloudEnabled, loadCloud } = cloudFor({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
  googleClientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
})
