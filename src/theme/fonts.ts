import { Platform } from 'react-native'

/**
 * Arabic is set in Amiri, bundled through the expo-font config plugin so it is
 * available before first paint. The display serif is the platform's own:
 * downloading a static Latin face buys little over Charter and Noto Serif.
 */
export const fonts = {
  display: Platform.select({ ios: 'Charter', android: 'serif', default: 'Georgia' }),
  arabic: 'Amiri-Regular',
}
