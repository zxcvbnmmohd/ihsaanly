const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidManifest,
  withAndroidStyles,
} = require('expo/config-plugins')

// The brand accent from `palettes` in src/theme/colors.ts. Keep them in step.
const ACCENT = { light: '#a94a32', dark: '#e28c6f' }

/**
 * Expo's template lets MainActivity handle `uiMode` itself, which stops
 * AppCompat from recreating the activity when the night mode changes. In that
 * arrangement `Appearance.setColorScheme` never reaches the activity's
 * resources, so every PlatformColor keeps the system scheme. Dropping the flag
 * restores the default Android behaviour: a theme change recreates the
 * activity and everything re-resolves.
 *
 * This only works because `expo-system-ui` is not installed. Its Android
 * lifecycle listener re-applies the static `userInterfaceStyle` on every
 * activity creation, which would undo the override on the very recreation
 * this plugin allows.
 */
/**
 * AppCompat colours its native dialogs (Alert.alert, the date picker) with
 * `colorAccent`, which the template leaves unset, so they came out teal.
 */
function withAccent(config) {
  const setAccent = (value) => (config) => {
    config.modResults = AndroidConfig.Colors.assignColorValue(config.modResults, {
      name: 'colorAccent',
      value,
    })
    return config
  }
  config = withAndroidColors(config, setAccent(ACCENT.light))
  config = withAndroidColorsNight(config, setAccent(ACCENT.dark))
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'colorAccent',
      value: '@color/colorAccent',
    })
    return config
  })
}

module.exports = function withAndroidManifestTweaks(config) {
  config = withAccent(config)
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0]
    // RTL layouts need this; expo-localization's plugin used to set it and is gone.
    if (application) application.$['android:supportsRtl'] = 'true'
    const main = application?.activity?.find((entry) => entry.$['android:name'] === '.MainActivity')
    const changes = main?.$['android:configChanges']
    if (main && changes) {
      main.$['android:configChanges'] = changes
        .split('|')
        .filter((value) => value !== 'uiMode')
        .join('|')
    }
    return config
  })
}
