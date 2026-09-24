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
      entitlements: {
        ...config.ios?.entitlements,
        'com.apple.security.application-groups': [group],
      },
    },
    android: { ...config.android, package: id },
    plugins: withGroup(config.plugins, group),
    extra: { ...config.extra, appGroup: group },
  }
}
