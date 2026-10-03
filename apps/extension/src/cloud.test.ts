import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Cloud } from '@ihsaanly/cloud/ports'
import { fakeChrome } from '../test/chrome'
import { type CloudEnv, cloudEnabled, cloudFor, loadCloud } from './cloud'

const CONFIGURED: CloudEnv = {
  apiKey: 'key',
  authDomain: 'x.firebaseapp.com',
  projectId: 'project',
  appId: 'app',
  emulatorHost: undefined,
  googleClientId: ' client-123 ',
}

// Never used as a cloud: only its identity is asserted.
const fakeCloud = {} as Cloud

interface Deps {
  getGoogleAccessToken: () => Promise<string>
}
let created: { config: unknown; deps: Deps }[] = []
mock.module('@ihsaanly/cloud/firebase/flows/extension', () => ({
  createExtensionCloud: async (config: unknown, deps: Deps) => {
    created.push({ config, deps })
    return fakeCloud
  },
}))

beforeEach(() => {
  created = []
  fakeChrome.reset()
})

describe('this build', () => {
  it('is local-only without the Firebase and OAuth variables', async () => {
    expect(cloudEnabled).toBe(false)
    await expect(loadCloud()).rejects.toThrow('Cloud is not configured')
  })
})

describe('local-only builds', () => {
  it('are disabled and refuse to load the cloud when nothing is configured', async () => {
    const cloud = cloudFor({
      apiKey: undefined,
      authDomain: undefined,
      projectId: undefined,
      appId: undefined,
      emulatorHost: undefined,
      googleClientId: undefined,
    })
    expect(cloud.cloudEnabled).toBe(false)
    await expect(cloud.loadCloud()).rejects.toThrow('Cloud is not configured')
    expect(created).toEqual([])
  })

  it('are disabled without an OAuth client id even when Firebase is configured', () => {
    expect(cloudFor({ ...CONFIGURED, googleClientId: '  ' }).cloudEnabled).toBe(false)
    expect(cloudFor({ ...CONFIGURED, googleClientId: undefined }).cloudEnabled).toBe(false)
  })
})

describe('configured builds', () => {
  async function token(): Promise<string> {
    await cloudFor(CONFIGURED).loadCloud()
    return created[0]?.deps.getGoogleAccessToken() ?? Promise.reject(new Error('no deps'))
  }

  it('hand the Firebase config and a token getter to the extension flow', async () => {
    const cloud = cloudFor({ ...CONFIGURED, emulatorHost: 'localhost:9099' })
    expect(cloud.cloudEnabled).toBe(true)
    await expect(cloud.loadCloud()).resolves.toBe(fakeCloud)
    expect(created[0]?.config).toEqual({
      apiKey: 'key',
      authDomain: 'x.firebaseapp.com',
      projectId: 'project',
      appId: 'app',
      emulatorHost: 'localhost:9099',
    })
  })

  it('read the access token from the redirect fragment', async () => {
    fakeChrome.authResult = 'https://fake-id.chromiumapp.org/#access_token=tok-1&token_type=Bearer'
    expect(await token()).toBe('tok-1')

    const [call] = fakeChrome.authCalls
    expect(call?.interactive).toBe(true)
    const url = new URL(call?.url ?? '')
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-123',
      response_type: 'token',
      redirect_uri: 'https://fake-id.chromiumapp.org/',
      scope: 'openid email profile',
    })
  })

  it('treat a closed window as a cancellation', async () => {
    fakeChrome.authResult = undefined
    await expect(token()).rejects.toThrow('Google sign-in was cancelled')
  })

  it('fail when the redirect carries no access token', async () => {
    fakeChrome.authResult = 'https://fake-id.chromiumapp.org/#error=access_denied'
    await expect(token()).rejects.toThrow('Google sign-in returned no access token')
  })

  it('let chrome.identity errors through', async () => {
    fakeChrome.authResult = new Error('The user did not approve access.')
    await expect(token()).rejects.toThrow('did not approve')
  })
})
