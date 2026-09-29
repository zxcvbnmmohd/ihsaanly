import { describe, expect, test } from 'bun:test'
import { APP_LINKS, intentUrl, platformOf, smartBannerContent } from './app-links.ts'

describe('platformOf', () => {
  test('iPhone and iPad user agents are ios', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
    expect(platformOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('ios')
  })

  test('an Android user agent is android', () => {
    expect(platformOf('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android')
  })

  test('anything else is other', () => {
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')).toBe('other')
  })
})

describe('intentUrl', () => {
  test('falls back to the web origin while there is no Play Store listing', () => {
    expect(APP_LINKS.playUrl).toBeNull()
    expect(intentUrl('/item/x')).toBe(
      `intent://item/x#Intent;scheme=${APP_LINKS.scheme};package=${APP_LINKS.androidPackage};S.browser_fallback_url=${encodeURIComponent(`${APP_LINKS.webOrigin}/item/x`)};end`,
    )
  })
})

describe('smartBannerContent', () => {
  test('null while there is no iOS App Store listing', () => {
    expect(APP_LINKS.iosAppId).toBeNull()
    expect(smartBannerContent('/item/x')).toBeNull()
  })
})
