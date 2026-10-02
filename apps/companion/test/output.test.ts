// The build writes everything a static Apache host needs, and it is well
// formed: valid JSON, a CSP with real hashes, the SPA rewrite in place.
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveAppEnv } from '@ihsaanly/web/app-env'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { THEME_COLOR } from '@ihsaanly/web/theme'

const DIST = join(import.meta.dir, '..', 'dist')
// The build and these tests run in one `bun run build`, so this is the
// environment the output in dist was built for.
const DEVELOPMENT = resolveAppEnv(process.env.VITE_APP_ENV) === 'development'

function read(path: string): string {
  return readFileSync(join(DIST, path), 'utf8')
}

describe('build output', () => {
  test('index.html has the pre-paint script and the manifest link', () => {
    const html = read('index.html')
    expect(html).toContain('id="root"')
    expect(html).toContain('ihsaanly.theme')
    expect(html).toContain('rel="manifest"')
  })

  test('headers.json is a single-policy SPA header map', () => {
    const map: HeaderMap = JSON.parse(read('headers.json'))
    const page = map.pages['/']
    expect(page).toBeDefined()
    expect(map.fallback).toBe(page ?? '')
    expect(map.fallback).toContain("worker-src 'self'")
    expect(map.fallback).toContain("manifest-src 'self'")
    expect(map.fallback).not.toContain('unsafe-inline')
  })

  test('.htaccess rewrites unknown paths to index.html and allows geolocation', () => {
    const htaccess = read('.htaccess')
    expect(htaccess).toContain('RewriteRule ^ /index.html [L]')
    expect(htaccess).toContain('geolocation=(self)')
    expect(htaccess).toContain('AddType application/manifest+json .webmanifest')
    expect(htaccess).toContain('apple-app-site-association')
  })

  test('_headers exists for Netlify-style hosts', () => {
    expect(existsSync(join(DIST, '_headers'))).toBe(true)
  })

  test('the service worker precaches the build and skips its own housekeeping files', () => {
    const sw = read('sw.js')
    expect(sw).toContain('self.skipWaiting')
    expect(sw).toContain('clients.claim')
    expect(sw).not.toContain('"/sw.js"')
    expect(sw).not.toContain('".htaccess"')
  })

  test('the manifest is valid and installable', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    expect(manifest.name).toBe(DEVELOPMENT ? 'Ihsaanly Dev' : 'Ihsaanly')
    expect(manifest.short_name).toBe(DEVELOPMENT ? 'Ihsaanly Dev' : 'Ihsaanly')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe(THEME_COLOR.light)
    expect(manifest.background_color).toBe(THEME_COLOR.light)
    expect(manifest.categories).toEqual(['lifestyle', 'education'])
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
      true,
    )
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(join(DIST, icon.src))).toBe(true)
    }
  })

  test('index.html carries the SEO and share tags, self-hosted', () => {
    const html = read('index.html')
    expect(html).toContain('<link rel="canonical" href="https://')
    expect(html).toContain('property="og:image" content="https://')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).not.toContain('__SITE_URL__')
    expect(html).not.toContain('__TITLE_PREFIX__')
    expect(existsSync(join(DIST, 'og.png'))).toBe(true)
    expect(read('sw.js')).toContain('"/og.png"')
  })

  test(
    DEVELOPMENT ? 'a development build is never indexed' : 'production is indexed at its door',
    () => {
      const html = read('index.html')
      expect(html.includes('<meta name="robots" content="noindex, nofollow"')).toBe(DEVELOPMENT)
      expect(html.includes('<title>Dev · ')).toBe(DEVELOPMENT)
      expect(read('robots.txt')).toBe(
        DEVELOPMENT ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n',
      )
      expect(read('.htaccess').includes('X-Robots-Tag')).toBe(DEVELOPMENT)
      expect(read('_headers').includes('X-Robots-Tag: noindex, nofollow')).toBe(DEVELOPMENT)
    },
  )

  test('the well-known files are valid JSON', () => {
    const aasa = JSON.parse(read('.well-known/apple-app-site-association'))
    expect(aasa.applinks.details[0].appIDs[0]).toContain('app.ihsaanly.companion')

    const assetlinks = JSON.parse(read('.well-known/assetlinks.json'))
    expect(assetlinks[0].target.package_name).toBe('app.ihsaanly.companion')
  })
})
