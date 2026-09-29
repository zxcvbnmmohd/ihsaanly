import { fonts } from '@ihsaanly/tailwind/tokens'
import { Platform } from 'react-native'

// `font-serif` and `font-arabic` resolve through a CSS variable holding the web
// stack, which native cannot use (one family name only) and NativeWind 5 (RC)
// did not override at runtime. So native text takes the family from here.

export const serif: string =
  Platform.select({ ios: fonts.serif.ios, android: fonts.serif.android }) ?? fonts.serif.web

export const arabic: string =
  Platform.select({ ios: fonts.arabic.ios, android: fonts.arabic.android }) ?? fonts.arabic.web
