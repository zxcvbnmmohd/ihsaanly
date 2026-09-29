// The build writes everything a static Apache host needs, and it is well
// formed: valid JSON, a CSP with real hashes, the SPA rewrite in place.
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'

const DIST = join(import.meta.dir, '..', 'dist')

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
    expect(manifest.name).toBe('Ihsaanly')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  })

  test('the well-known files are valid JSON', () => {
    const aasa = JSON.parse(read('.well-known/apple-app-site-association'))
    expect(aasa.applinks.details[0].appIDs[0]).toContain('app.ihsaanly.companion')

    const assetlinks = JSON.parse(read('.well-known/assetlinks.json'))
    expect(assetlinks[0].target.package_name).toBe('app.ihsaanly.companion')
  })
})
