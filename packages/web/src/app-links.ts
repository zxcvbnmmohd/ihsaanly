// App-detection config for the companion app: what opens the installed app
// or points a visitor at the store, kept dormant (null) while the store
// listings don't exist yet.

export interface AppLinks {
  /** The app's custom URL scheme, e.g. `ihsaanly://item/x`. */
  scheme: string
  iosAppId: string | null
  androidPackage: string
  appStoreUrl: string | null
  playUrl: string | null
  /** The companion web app's own origin, used as the Android intent fallback while there is no Play listing. */
  webOrigin: string
}

export const APP_LINKS: AppLinks = {
  scheme: 'ihsaanly',
  iosAppId: null,
  androidPackage: 'app.ihsaanly.companion',
  appStoreUrl: null,
  playUrl: null,
  webOrigin: 'https://companion.ihsaanly.app',
}

/**
 * An Android intent link for `path`: opens the installed app if there is one,
 * else falls back to the Play Store listing, or the web app itself while
 * there is no Play listing yet.
 */
export function intentUrl(path: string): string {
  const fallback = APP_LINKS.playUrl ?? `${APP_LINKS.webOrigin}${path}`
  return `intent://${path.replace(/^\//, '')}#Intent;scheme=${APP_LINKS.scheme};package=${APP_LINKS.androidPackage};S.browser_fallback_url=${encodeURIComponent(fallback)};end`
}

/**
 * `<meta name="apple-itunes-app">` content for iOS Safari's own Smart App
 * Banner — null while there is no App Store listing for it to link to.
 */
export function smartBannerContent(path: string): string | null {
  if (!APP_LINKS.iosAppId) return null
  return `app-id=${APP_LINKS.iosAppId}, app-argument=${APP_LINKS.webOrigin}${path}`
}

export type Platform = 'ios' | 'android' | 'other'

/** Coarse platform detection from a User-Agent string, for choosing which app-detection UI to show. */
export function platformOf(userAgent: string): Platform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  return 'other'
}
