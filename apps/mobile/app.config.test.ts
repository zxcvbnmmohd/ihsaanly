import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { ConfigContext, ExpoConfig } from 'expo/config'
import build from './app.config'

const KEYS = [
  'APP_VARIANT',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
] as const
const CLOUD = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'x.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'x',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:2:ios:3',
}

const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = Reflect.get(process.env, key)
    Reflect.deleteProperty(process.env, key)
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) Reflect.deleteProperty(process.env, key)
    else Reflect.set(process.env, key, saved[key])
  }
})

type PrivacyManifests = NonNullable<NonNullable<ExpoConfig['ios']>['privacyManifests']>

const base: ExpoConfig = {
  name: 'Ihsaanly',
  slug: 'ihsaanly',
  ios: { entitlements: { 'aps-environment': 'production' } },
  android: { package: 'app.ihsaanly.companion' },
  plugins: [
    'expo-router',
    ['expo-widgets', { widgets: ['a'] }],
    ['expo-widgets-like', {}],
    ['expo-widgets', 'not-an-object-null' as never],
  ],
  extra: { keep: true },
}
const run = (config: ExpoConfig = base): ExpoConfig =>
  build({
    config,
    projectRoot: '/',
    staticConfigPath: null,
    packageJsonPath: null,
  } as ConfigContext)

describe('variants', () => {
  it('is production when APP_VARIANT is missing or empty', () => {
    for (const value of [undefined, '']) {
      if (value === undefined) delete process.env.APP_VARIANT
      else process.env.APP_VARIANT = value
      const config = run()
      expect(config.name).toBe('Ihsaanly')
      expect(config.ios?.bundleIdentifier).toBe('app.ihsaanly.companion')
      expect(config.android?.package).toBe('app.ihsaanly.companion')
    }
  })

  it.each([
    ['development', 'Ihsaanly Development', 'app.ihsaanly.companion.development'],
    ['staging', 'Ihsaanly Staging', 'app.ihsaanly.companion.staging'],
    ['production', 'Ihsaanly', 'app.ihsaanly.companion'],
  ])('%s gets its own name, identifier and App Group', (variant, name, id) => {
    process.env.APP_VARIANT = variant
    const config = run()
    expect(config.name).toBe(name)
    expect(config.ios?.bundleIdentifier).toBe(id)
    expect(config.android?.package).toBe(id)
    expect(config.extra).toEqual({ keep: true, appGroup: `group.${id}` })
    expect(config.ios?.entitlements).toEqual({
      'aps-environment': 'production',
      'com.apple.security.application-groups': [`group.${id}`],
    })
  })

  it('rejects an unknown variant so a store build can never ship a test id', () => {
    process.env.APP_VARIANT = 'beta'
    expect(() => run()).toThrow(
      'APP_VARIANT must be development, staging or production, not "beta"',
    )
  })

  it('falls back to the slug when the config has none', () => {
    expect(run({ name: 'x' } as ExpoConfig).slug).toBe('ihsaanly')
    expect(run({ name: 'x', slug: 'mine' }).slug).toBe('mine')
  })

  it('works from an empty config', () => {
    process.env.APP_VARIANT = 'development'
    const config = run({} as ExpoConfig)
    expect(config.plugins).toBeUndefined()
    expect(config.ios?.entitlements).toEqual({
      'com.apple.security.application-groups': ['group.app.ihsaanly.companion.development'],
    })
  })
})

describe('widgets plugin', () => {
  it('points expo-widgets at this variant App Group and leaves other plugins alone', () => {
    process.env.APP_VARIANT = 'staging'
    const plugins = run().plugins
    expect(plugins?.[0]).toBe('expo-router')
    expect(plugins?.[1]).toEqual([
      'expo-widgets',
      { widgets: ['a'], groupIdentifier: 'group.app.ihsaanly.companion.staging' },
    ])
    expect(plugins?.[2]).toEqual(['expo-widgets-like', {}])
    // Options that are not an object are replaced, not spread.
    expect(plugins?.[3]).toEqual([
      'expo-widgets',
      { groupIdentifier: 'group.app.ihsaanly.companion.staging' },
    ])
  })

  it('treats null options as none', () => {
    const plugins = run({ ...base, plugins: [['expo-widgets', null as never]] }).plugins
    expect(plugins?.[0]).toEqual([
      'expo-widgets',
      { groupIdentifier: 'group.app.ihsaanly.companion' },
    ])
  })
})

describe('sign-in', () => {
  it('adds nothing in a build without a Firebase config', () => {
    const config = run()
    expect(config.ios?.usesAppleSignIn).toBeUndefined()
    expect(config.plugins).not.toContain('expo-apple-authentication')
  })

  it.each(Object.keys(CLOUD))('stays local-only when %s is missing', (missing) => {
    Object.assign(process.env, CLOUD)
    Reflect.deleteProperty(process.env, missing)
    expect(run().ios?.usesAppleSignIn).toBeUndefined()
  })

  it('enables Apple sign-in with a Firebase config but no Google client', () => {
    Object.assign(process.env, CLOUD)
    const config = run()
    expect(config.ios?.usesAppleSignIn).toBe(true)
    expect(config.plugins).toContain('expo-apple-authentication')
    expect(config.plugins?.some((p) => Array.isArray(p) && p[0]?.includes('google-signin'))).toBe(
      false,
    )
  })

  it('ignores a blank Google client id', () => {
    Object.assign(process.env, CLOUD, { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '   ' })
    expect(run().plugins?.some((p) => Array.isArray(p) && p[0]?.includes('google-signin'))).toBe(
      false,
    )
  })

  it('derives the reversed Google URL scheme from the iOS client id', () => {
    Object.assign(process.env, CLOUD, {
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ' 123-abc.apps.googleusercontent.com ',
    })
    expect(run().plugins).toContainEqual([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.123-abc' },
    ])
  })

  it('keeps an id that is already bare', () => {
    Object.assign(process.env, CLOUD, { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '456-def' })
    expect(run().plugins).toContainEqual([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.456-def' },
    ])
  })

  it('adds the sign-in plugins to a config that had none', () => {
    Object.assign(process.env, CLOUD)
    expect(run({} as ExpoConfig).plugins).toEqual(['expo-apple-authentication'])
  })
})

describe('privacy manifest', () => {
  const manifest = (): PrivacyManifests | undefined => run().ios?.privacyManifests

  it('does not track', () => {
    expect(manifest()?.NSPrivacyTracking).toBe(false)
    expect(manifest()?.NSPrivacyTrackingDomains).toEqual([])
  })

  it('declares every collected type as linked, untracked app functionality', () => {
    const collected = manifest()?.NSPrivacyCollectedDataTypes ?? []
    expect(collected.map((entry) => entry.NSPrivacyCollectedDataType)).toEqual([
      'NSPrivacyCollectedDataTypeEmailAddress',
      'NSPrivacyCollectedDataTypeName',
      'NSPrivacyCollectedDataTypeUserID',
      'NSPrivacyCollectedDataTypeCoarseLocation',
      'NSPrivacyCollectedDataTypeOtherUserContent',
      'NSPrivacyCollectedDataTypeOtherDiagnosticData',
      'NSPrivacyCollectedDataTypeSensitiveInfo',
    ])
    for (const entry of collected) {
      expect(entry.NSPrivacyCollectedDataTypeLinked).toBe(true)
      expect(entry.NSPrivacyCollectedDataTypeTracking).toBe(false)
      expect(entry.NSPrivacyCollectedDataTypePurposes).toEqual([
        'NSPrivacyCollectedDataTypeAppFunctionality',
      ])
    }
  })

  it('states the required-reason APIs, including the App Group defaults reason', () => {
    const apis = manifest()?.NSPrivacyAccessedAPITypes ?? []
    expect(apis.map((api) => api.NSPrivacyAccessedAPIType)).toEqual([
      'NSPrivacyAccessedAPICategoryUserDefaults',
      'NSPrivacyAccessedAPICategoryFileTimestamp',
      'NSPrivacyAccessedAPICategorySystemBootTime',
      'NSPrivacyAccessedAPICategoryDiskSpace',
    ])
    expect(apis[0]?.NSPrivacyAccessedAPITypeReasons).toEqual(['CA92.1', '1C8F.1'])
  })

  it('is the same in a build with a Firebase config', () => {
    const local = manifest()
    Object.assign(process.env, CLOUD)
    expect(manifest()).toEqual(local)
  })
})
