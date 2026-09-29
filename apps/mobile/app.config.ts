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
