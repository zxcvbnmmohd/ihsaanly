import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cspHash, type HeaderMap, inlineBlocks } from '@ihsaanly/web/hosting/csp'
import { postbuild } from './postbuild'

const INDEX = `<!doctype html><html><head><script>window.theme = 1</script></head><body><div id="root"></div></body></html>`
const MANIFEST = { name: 'Ihsaanly', short_name: 'Ihsaanly', icons: [] }

let dist: string

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'companion-postbuild-'))
  writeFileSync(join(dist, 'index.html'), INDEX)
  writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify(MANIFEST))
  mkdirSync(join(dist, 'assets'))
  writeFileSync(join(dist, 'assets', 'app-abc123.js'), 'console.log("app")')
})

afterEach(() => {
  rmSync(dist, { recursive: true, force: true })
})

const read = (path: string): string => readFileSync(join(dist, path), 'utf8')
const headerMap = (): HeaderMap => JSON.parse(read('headers.json'))

describe('a production build', () => {
  beforeEach(() => postbuild({ dist, env: {} }))

  it('writes one policy that allows the inline script by hash, for the door and every other path', () => {
    const map = headerMap()
    const hash = cspHash(inlineBlocks(INDEX).scripts[0] as string)
    expect(map.pages['/']).toContain(hash)
    expect(map.fallback).toBe(map.pages['/'] as string)
    expect(map.fallback).toContain("worker-src 'self'")
    expect(map.fallback).toContain("manifest-src 'self'")
    expect(map.fallback).toContain('img-src')
    expect(map.fallback).not.toContain('firebaseapp')
    expect(map.fallback).not.toContain('apis.google.com')
  })

  it('lets only this origin use geolocation, and does not mark the site noindex', () => {
    const map = headerMap()
    expect(map.headers?.['Permissions-Policy']).toContain('geolocation=(self)')
    expect(map.headers?.['X-Robots-Tag']).toBeUndefined()
    expect(read('.htaccess')).toContain('geolocation=(self)')
    expect(read('.htaccess')).not.toContain('X-Robots-Tag')
    expect(read('_headers')).not.toContain('X-Robots-Tag')
  })

  it('rewrites unknown paths to index.html and always revalidates sw.js, the manifest and the well-known files', () => {
    const htaccess = read('.htaccess')
    expect(htaccess).toContain('RewriteRule ^ /index.html [L]')
    expect(htaccess).toContain('<FilesMatch "^(sw\\.js|manifest\\.webmanifest)$">')
    expect(htaccess).toContain('<Files "apple-app-site-association">')
    expect(htaccess).toContain('<Files "assetlinks.json">')
    expect(htaccess).toContain('Header set Cache-Control "no-cache"')
  })

  it('allows all crawlers and keeps the manifest name', () => {
    expect(read('robots.txt')).toBe('User-agent: *\nAllow: /\n')
    expect(JSON.parse(read('manifest.webmanifest'))).toEqual(MANIFEST)
  })

  it('writes the app-link files for the companion package', () => {
    const aasa = JSON.parse(read('.well-known/apple-app-site-association'))
    expect(aasa.applinks.details[0].appIDs).toEqual(['TEAMID.app.ihsaanly.companion'])
    const assetlinks = JSON.parse(read('.well-known/assetlinks.json'))
    expect(assetlinks[0].target.package_name).toBe('app.ihsaanly.companion')
  })

  it('precaches the build, but not its own housekeeping files or the well-known ones', () => {
    const sw = read('sw.js')
    const precache = JSON.parse(/const PRECACHE = (.*)/.exec(sw)?.[1] ?? '[]') as string[]
    expect(precache).toEqual(['/assets/app-abc123.js', '/index.html', '/manifest.webmanifest'])
    expect(sw).toContain('self.skipWaiting')
    expect(sw).toContain('self.clients.claim')
  })

  it('lists files in a fixed order, so the version never depends on the file system', () => {
    const precache = JSON.parse(
      /const PRECACHE = (.*)/.exec(read('sw.js'))?.[1] ?? '[]',
    ) as string[]
    expect(precache).toEqual([...precache].sort())
  })

  it('versions the worker by the content it caches', () => {
    const version = /const VERSION = "([0-9a-f]{16})"/.exec(read('sw.js'))?.[1]
    const files = ['assets/app-abc123.js', 'index.html', 'manifest.webmanifest']
    const expected = createHash('sha256')
      .update(
        files
          .map((path) => `${path}\u0000${readFileSync(join(dist, path)).toString('base64')}`)
          .join('\n'),
      )
      .digest('hex')
      .slice(0, 16)
    expect(version).toBe(expected)
  })
})

describe('the Firebase auth domain', () => {
  it('widens the policy to Firebase, and only to what sign-in needs', () => {
    postbuild({ dist, env: { VITE_FIREBASE_AUTH_DOMAIN: ' app.firebaseapp.com ' } })
    const policy = headerMap().fallback
    expect(policy).toContain('https://app.firebaseapp.com')
    expect(policy).toContain('https://securetoken.googleapis.com')
    expect(policy).toContain('https://identitytoolkit.googleapis.com')
    expect(policy).toContain('https://firestore.googleapis.com')
    expect(policy).toContain('https://apis.google.com')
    expect(policy).toMatch(/img-src [^;]*https:\/\/www\.google\.com/)
    expect(policy).not.toContain('*.googleapis.com')
    expect(policy).toContain(cspHash(inlineBlocks(INDEX).scripts[0] as string))
  })

  it('lets the sign-in popup reach back to the page, in every header file', () => {
    postbuild({ dist, env: { VITE_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com' } })
    expect(headerMap().headers?.['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups')
    expect(readFileSync(join(dist, '.htaccess'), 'utf8')).toContain(
      'Cross-Origin-Opener-Policy "same-origin-allow-popups"',
    )
    expect(readFileSync(join(dist, '_headers'), 'utf8')).toContain(
      'Cross-Origin-Opener-Policy: same-origin-allow-popups',
    )
  })

  it('stays out of the policy when blank, and keeps the strict opener policy', () => {
    postbuild({ dist, env: { VITE_FIREBASE_AUTH_DOMAIN: '   ' } })
    expect(headerMap().fallback).not.toContain('googleapis')
    expect(headerMap().fallback).not.toContain('www.google.com')
    expect(headerMap().headers?.['Cross-Origin-Opener-Policy']).toBeUndefined()
    expect(readFileSync(join(dist, '.htaccess'), 'utf8')).toContain(
      'Cross-Origin-Opener-Policy "same-origin"',
    )
  })
})

describe('content updates', () => {
  it('lets every build fetch the published content, from production by default', () => {
    postbuild({ dist, env: {} })
    expect(headerMap().fallback).toContain("connect-src 'self' https://ihsaanly.app;")
  })

  it('allows the origin of VITE_CONTENT_URL, with or without cloud sync', () => {
    postbuild({ dist, env: { VITE_CONTENT_URL: ' https://dev.ihsaanly.app/content ' } })
    expect(headerMap().fallback).toContain("connect-src 'self' https://dev.ihsaanly.app;")
    postbuild({
      dist,
      env: {
        VITE_CONTENT_URL: 'https://dev.ihsaanly.app/content',
        VITE_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
      },
    })
    expect(headerMap().fallback).toMatch(
      /connect-src 'self' https:\/\/dev\.ihsaanly\.app https:\/\/securetoken/,
    )
  })

  it('refuses a content URL that is not a URL', () => {
    expect(() => postbuild({ dist, env: { VITE_CONTENT_URL: 'ihsaanly.app/content' } })).toThrow()
  })
})

describe('a development build', () => {
  beforeEach(() => postbuild({ dist, env: { VITE_APP_ENV: 'development' } }))

  it('is never indexed, in every file that can say so', () => {
    expect(read('robots.txt')).toBe('User-agent: *\nDisallow: /\n')
    expect(headerMap().headers?.['X-Robots-Tag']).toBe('noindex, nofollow')
    expect(read('.htaccess')).toContain('X-Robots-Tag')
    expect(read('_headers')).toContain('X-Robots-Tag: noindex, nofollow')
  })

  it('is installed as "Ihsaanly Dev"', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    expect(manifest).toMatchObject({ name: 'Ihsaanly Dev', short_name: 'Ihsaanly Dev' })
  })
})

describe('refusals', () => {
  it('stops on an inline style attribute, which the policy would block', () => {
    writeFileSync(join(dist, 'index.html'), '<div style="color:red"></div>')
    expect(() => postbuild({ dist, env: {} })).toThrow('a style attribute the CSP blocks')
    expect(existsSync(join(dist, 'headers.json'))).toBe(false)
  })

  it('can run twice over the same folder without precaching its own output', () => {
    postbuild({ dist, env: {} })
    const first = read('sw.js')
    postbuild({ dist, env: {} })
    expect(read('sw.js')).toBe(first)
  })
})
