import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Three builds that install side by side: each has its own identifier, so its
 * own storage, App Group and keychain. `app.json` holds production; a missing
 * APP_VARIANT means production, so a store build can never ship a test id.
 * `eas.json` sets the variant per profile, and `bun run ios|android` build
 * development locally.
 *
 * ponytail: the `ihsaanly://` scheme is shared by all three, because iOS
 * widget bodies cannot import it. With two variants installed a widget tap may
 * open the other one; give each variant a scheme if that ever matters.
 */
type Variant = 'development' | 'staging' | 'production'

interface VariantConfig {
  suffix: string
  name: string
}

const VARIANTS: Record<Variant, VariantConfig> = {
  development: { suffix: '.development', name: 'Ihsaanly Development' },
  staging: { suffix: '.staging', name: 'Ihsaanly Staging' },
  production: { suffix: '', name: 'Ihsaanly' },
}

const BASE_ID = 'app.ihsaanly.companion'

function variant(): Variant {
  const value = process.env.APP_VARIANT || 'production'
  if (value === 'development' || value === 'staging' || value === 'production') return value
  throw new Error(`APP_VARIANT must be development, staging or production, not "${value}"`)
}

/**
 * CI sets BUILD_NUMBER, counting up from 1, as both the iOS build number and
 * the Android versionCode, so every store upload is higher than the last. The
 * marketing version (`app.json` `version`) is semver, bumped by hand per release.
 */
function buildNumber(): number | undefined {
  const value = Number(process.env.BUILD_NUMBER)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

/** Points the expo-widgets plugin at this variant's App Group. */
function withGroup(plugins: ExpoConfig['plugins'], group: string): ExpoConfig['plugins'] {
  return plugins?.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-widgets') return plugin
    const options: unknown = plugin[1]
    const base = typeof options === 'object' && options !== null ? options : {}
    return ['expo-widgets', { ...base, groupIdentifier: group }]
  })
}

/**
 * Sign-in is configured only when the build carries a Firebase config (see
 * `.env.example`); a local-only build gets neither the Sign in with Apple
 * entitlement nor the Google URL scheme, so it signs and runs as before.
 */
function hasCloud(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  )
}

/** `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`, the scheme iOS calls back on. */
function googleUrlScheme(): string | null {
  const id = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
  if (!id) return null
  return `com.googleusercontent.apps.${id.replace(/\.apps\.googleusercontent\.com$/, '')}`
}

function withSignIn(plugins: ExpoConfig['plugins']): ExpoConfig['plugins'] {
  if (!hasCloud()) return plugins
  const scheme = googleUrlScheme()
  return [
    ...(plugins ?? []),
    'expo-apple-authentication',
    ...(scheme
      ? [
          ['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }] as [
            string,
            unknown,
          ],
        ]
      : []),
  ]
}

/**
 * Native Firebase, for the two opt-ins only: announcements (Cloud Messaging
 * topics) and crash reports (Crashlytics). Sign-in and sync stay on the JS
 * SDK. The config files are public client config, like the web config, and
 * are committed per Firebase project; staging shares development's project.
 * `firebase.json` beside this file keeps Crashlytics collection and messaging
 * auto-init off until the person turns each on.
 */
function firebaseFiles(name: Variant): { ios: string; android: string } {
  const dir = `./firebase/${name === 'production' ? 'production' : 'development'}`
  return { ios: `${dir}/GoogleService-Info.plist`, android: `${dir}/google-services.json` }
}

/**
 * React Native Firebase resolves the Apple SDK with Swift Package Manager by
 * default, which needs dynamic frameworks. Static frameworks are the
 * long-standing Expo setup and what the other native modules here are built
 * against, so SPM is turned off and the Firebase pods come from CocoaPods,
 * linked statically (rnfirebase.io, "Expo" → "iOS").
 */
const FIREBASE_PLUGINS: NonNullable<ExpoConfig['plugins']> = [
  ['@react-native-firebase/app', { ios: { disableSPM: true } }],
  '@react-native-firebase/messaging',
  '@react-native-firebase/crashlytics',
  [
    'expo-build-properties',
    {
      ios: {
        useFrameworks: 'static',
        forceStaticLinking: ['RNFBApp', 'RNFBMessaging', 'RNFBCrashlytics'],
      },
    },
  ],
]

type PrivacyManifests = NonNullable<NonNullable<ExpoConfig['ios']>['privacyManifests']>

const APP_FUNCTIONALITY = ['NSPrivacyCollectedDataTypeAppFunctionality']

/**
 * What the sign-in and sync code can send off the device, as App Store
 * privacy labels: account details and the synced preferences and events.
 * Declared in every build, not only cloud ones: the manifest describes what
 * the app is able to collect, a local-only build merely never does, and one
 * fixed manifest cannot drift from the store listing. Nothing here tracks.
 */
const COLLECTED_DATA_TYPES = [
  'NSPrivacyCollectedDataTypeEmailAddress',
  'NSPrivacyCollectedDataTypeName',
  'NSPrivacyCollectedDataTypeUserID',
  'NSPrivacyCollectedDataTypeCoarseLocation',
  'NSPrivacyCollectedDataTypeOtherUserContent',
  // Send feedback, when the person turns on the optional diagnostic summary.
  'NSPrivacyCollectedDataTypeOtherDiagnosticData',
  // The synced practice record reveals religious practice (App Store label: Sensitive Info).
  'NSPrivacyCollectedDataTypeSensitiveInfo',
].map((type) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: APP_FUNCTIONALITY,
}))

/**
 * What the opt-in "Share crash reports" (Crashlytics) and "Announcements"
 * (FCM) switches can send: crash data, and the Firebase installation / FCM and
 * APNs tokens, which Google's Firebase disclosure guide says to declare as
 * Device ID. Neither is linked to the person (no account or user ID is
 * attached) and neither tracks. Both are off until the person turns them on.
 */
const UNLINKED_DATA_TYPES = [
  'NSPrivacyCollectedDataTypeCrashData',
  'NSPrivacyCollectedDataTypeDeviceID',
].map((type) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: false,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: APP_FUNCTIONALITY,
}))

/**
 * Required-reason APIs. Expo's template PrivacyInfo.xcprivacy already lists
 * these four categories; Expo merges by category and de-duplicates reasons, so
 * restating them is harmless and keeps the declaration correct if the template
 * changes. 1C8F.1 is ours: the widget and app share defaults through the App
 * Group.
 */
const ACCESSED_API_TYPES = [
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
    NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
    NSPrivacyAccessedAPITypeReasons: ['C617.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
    NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
  },
  {
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
    NSPrivacyAccessedAPITypeReasons: ['E174.1'],
  },
]

const PRIVACY_MANIFESTS: PrivacyManifests = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [...COLLECTED_DATA_TYPES, ...UNLINKED_DATA_TYPES],
  NSPrivacyAccessedAPITypes: ACCESSED_API_TYPES,
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const current = variant()
  const { suffix, name } = VARIANTS[current]
  const firebase = firebaseFiles(current)
  const id = `${BASE_ID}${suffix}`
  const group = `group.${id}`
  const build = buildNumber()

  return {
    ...config,
    name,
    slug: config.slug ?? 'ihsaanly',
    ios: {
      ...config.ios,
      bundleIdentifier: id,
      buildNumber: build === undefined ? config.ios?.buildNumber : String(build),
      googleServicesFile: firebase.ios,
      privacyManifests: PRIVACY_MANIFESTS,
      ...(hasCloud() ? { usesAppleSignIn: true } : {}),
      entitlements: {
        ...config.ios?.entitlements,
        'com.apple.security.application-groups': [group],
      },
    },
    android: {
      ...config.android,
      package: id,
      googleServicesFile: firebase.android,
      versionCode: build ?? config.android?.versionCode,
    },
    plugins: [...(withSignIn(withGroup(config.plugins, group)) ?? []), ...FIREBASE_PLUGINS],
    extra: { ...config.extra, appGroup: group },
  }
}
