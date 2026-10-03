import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { createHash } from 'node:crypto'
import * as session from '@ihsaanly/state/cloud/session'

interface Deps {
  storage: unknown
  appleIdToken: () => Promise<{ idToken: string; rawNonce: string }>
  googleIdToken: () => Promise<string>
  appleAvailable: () => Promise<boolean>
}

const fake = {
  created: [] as { config: Record<string, unknown>; deps: Deps }[],
  /** What the fake auth.signIn does with the deps it was built with. */
  signIn: (async () => account) as (provider: string, deps: Deps) => Promise<unknown>,
  signOuts: 0,
  uuid: 'raw-nonce-123',
  appleCredential: { identityToken: 'apple-jwt' } as { identityToken: string | null },
  appleCalls: [] as Record<string, unknown>[],
  appleAvailable: true,
  googleResponse: { type: 'success', data: { idToken: 'google-jwt' } } as unknown,
  googleConfigured: [] as unknown[],
  playServices: 0,
  reloads: [] as string[],
}

const account = {
  uid: 'u1',
  email: 'a@b.c',
  displayName: null,
  provider: 'apple',
  providers: ['apple'],
}

// Keeps expo's real exports: theme-override reads `requireOptionalNativeModule` from it.
const realExpo = { ...(await import(`${Bun.resolveSync('expo', import.meta.dir)}?real`)) }

function install(): void {
  mock.module('expo', () => ({
    ...realExpo,
    reloadAppAsync: async (reason: string) => {
      fake.reloads.push(reason)
    },
  }))
  mock.module('expo-sqlite/kv-store', () => ({ default: { kv: true } }))
  mock.module('expo-crypto', () => ({
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    randomUUID: () => fake.uuid,
    digestStringAsync: async (algorithm: string, value: string) => {
      expect(algorithm).toBe('SHA-256')
      return createHash('sha256').update(value).digest('hex')
    },
  }))
  mock.module('expo-apple-authentication', () => ({
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
    AppleAuthenticationButton: () => null,
    signInAsync: async (options: Record<string, unknown>) => {
      fake.appleCalls.push(options)
      return fake.appleCredential
    },
    isAvailableAsync: async () => fake.appleAvailable,
  }))
  mock.module('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
      configure: (options: unknown) => fake.googleConfigured.push(options),
      hasPlayServices: async () => {
        fake.playServices += 1
      },
      signIn: async () => fake.googleResponse,
    },
    GoogleSigninButton: Object.assign(() => null, {
      Size: { Wide: 1 },
      Color: { Dark: 0, Light: 1 },
    }),
  }))
  mock.module('@ihsaanly/cloud/firebase/flows/native', () => ({
    createNativeCloud: async (config: Record<string, unknown>, deps: Deps) => {
      fake.created.push({ config, deps })
      return {
        auth: {
          current: () => null,
          onChange: () => () => {},
          signIn: (provider: string) => fake.signIn(provider, deps),
          link: async () => account,
          signOut: async () => {
            fake.signOuts += 1
          },
          deleteAccount: async () => {},
        },
        remote: {
          pull: async () => ({ events: [], preferences: [], cursor: null }),
          push: async () => {},
          erase: async () => {},
        },
        feedback: { send: async () => {} },
      }
    },
  }))
}

install()
const cloud = await import('./cloud')

const config = {
  apiKey: 'key',
  authDomain: 'x.firebaseapp.com',
  projectId: 'proj',
  appId: 'app',
}

/** The deps the native cloud was last built with. */
async function loadDeps(): Promise<Deps> {
  await cloud.loadCloud(config)
  const created = fake.created.at(-1)
  if (!created) throw new Error('cloud was not created')
  return created.deps
}

const spies: { mockRestore: () => void }[] = []

beforeEach(() => {
  install()
  fake.created = []
  fake.signIn = async () => account
  fake.signOuts = 0
  fake.uuid = 'raw-nonce-123'
  fake.appleCredential = { identityToken: 'apple-jwt' }
  fake.appleCalls = []
  fake.appleAvailable = true
  fake.googleResponse = { type: 'success', data: { idToken: 'google-jwt' } }
  fake.googleConfigured = []
  fake.playServices = 0
  fake.reloads = []
})
afterEach(() => {
  for (const created of spies.splice(0)) created.mockRestore()
})

describe('configuration', () => {
  it('links the published legal pages', () => {
    expect(cloud.LEGAL_URLS.privacy).toBe('https://ihsaanly.app/legal/privacy')
    expect(cloud.LEGAL_URLS.terms).toBe('https://ihsaanly.app/legal/terms')
    expect(cloud.LEGAL_URLS.deleteAccount).toBe('https://ihsaanly.app/legal/delete-account')
  })

  it('hands the native cloud the config, the key-value storage and the providers', async () => {
    const deps = await loadDeps()
    expect(fake.created[0]?.config).toEqual(config)
    expect(deps.storage).toEqual({ kv: true })
    expect(await deps.appleAvailable()).toBe(true)
    fake.appleAvailable = false
    expect(await deps.appleAvailable()).toBe(false)
  })

  it('refuses to build a cloud without a Firebase config', async () => {
    await expect(cloud.loadCloud(null)).rejects.toThrow('Firebase is not configured')
    expect(fake.created).toEqual([])
  })
})

describe('Apple sign-in', () => {
  it('sends Apple the SHA-256 of the nonce and Firebase the raw one', async () => {
    const deps = await loadDeps()
    const result = await deps.appleIdToken()

    const hashed = createHash('sha256').update('raw-nonce-123').digest('hex')
    expect(fake.appleCalls[0]).toEqual({ requestedScopes: [0, 1], nonce: hashed })
    expect(result).toEqual({ idToken: 'apple-jwt', rawNonce: 'raw-nonce-123' })
    expect(result.rawNonce).not.toBe(hashed)
  })

  it('fails when Apple returns no identity token', async () => {
    const deps = await loadDeps()
    fake.appleCredential = { identityToken: null }
    await expect(deps.appleIdToken()).rejects.toThrow('Apple returned no identity token')
  })
})

describe('Google sign-in', () => {
  it('configures the SDK once, checks Play services and returns the ID token', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client'
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client'
    const deps = await loadDeps()
    expect(await deps.googleIdToken()).toBe('google-jwt')
    expect(await deps.googleIdToken()).toBe('google-jwt')
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    expect(fake.googleConfigured).toEqual([
      { webClientId: 'web-client', iosClientId: 'ios-client' },
    ])
    expect(fake.playServices).toBe(2)
  })

  it('reports a dismissed sheet as a cancellation the session does not treat as an error', async () => {
    const deps = await loadDeps()
    fake.googleResponse = { type: 'cancelled', data: null }
    const error = await deps.googleIdToken().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expect((error as { code?: string }).code).toBe('cancelled')
    expect(session.isCancelled(error)).toBe(true)
  })

  it('fails when Google returns no ID token', async () => {
    const deps = await loadDeps()
    fake.googleResponse = { type: 'success', data: { idToken: null } }
    await expect(deps.googleIdToken()).rejects.toThrow('Google returned no ID token')
  })
})

describe('startMobileCloud', () => {
  function capture(): { load: () => Promise<unknown>; options: { onWiped: () => void } } {
    const stop = (): void => {}
    const started = spyOn(session, 'startCloud').mockReturnValue(stop)
    spies.push(started)
    expect(cloud.startMobileCloud()).toBe(stop)
    const [load, options] = started.mock.calls[0] as [
      () => Promise<unknown>,
      { onWiped: () => void },
    ]
    return { load, options }
  }

  it('starts sync with a loader for this build', async () => {
    const { load } = capture()
    if (cloud.cloudEnabled) {
      await load()
      expect(fake.created).toHaveLength(1)
    } else {
      await expect(load()).rejects.toThrow('Firebase is not configured')
    }
  })

  it('reloads the app after local data is wiped', () => {
    const { options } = capture()
    options.onWiped()
    expect(fake.reloads).toHaveLength(1)
  })
})
