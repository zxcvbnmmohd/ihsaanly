const { withAndroidManifest } = require('expo/config-plugins')

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
module.exports = function withAndroidManifestTweaks(config) {
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
