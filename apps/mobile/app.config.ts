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
  // The synced practice record reveals religious practice (App Store label: Sensitive Info).
  'NSPrivacyCollectedDataTypeSensitiveInfo',
].map((type) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: true,
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
  NSPrivacyCollectedDataTypes: COLLECTED_DATA_TYPES,
  NSPrivacyAccessedAPITypes: ACCESSED_API_TYPES,
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const { suffix, name } = VARIANTS[variant()]
  const id = `${BASE_ID}${suffix}`
  const group = `group.${id}`

  return {
    ...config,
    name,
    slug: config.slug ?? 'ihsaanly',
    ios: {
      ...config.ios,
      bundleIdentifier: id,
      privacyManifests: PRIVACY_MANIFESTS,
      ...(hasCloud() ? { usesAppleSignIn: true } : {}),
      entitlements: {
        ...config.ios?.entitlements,
        'com.apple.security.application-groups': [group],
      },
    },
    android: { ...config.android, package: id },
    plugins: withSignIn(withGroup(config.plugins, group)),
    extra: { ...config.extra, appGroup: group },
  }
}
