import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ContentManifest } from '@ihsaanly/core/content/bundle'
import { DEVELOPMENT_ROBOTS } from '@ihsaanly/web/app-env'
import { cspHash, type HeaderMap } from '@ihsaanly/web/hosting/csp'
import { LOCALES, PAGES } from '../src/i18n/locales.ts'
import {
  CONTENT_HEADERS,
  cli,
  flatten,
  htmlFiles,
  policies,
  postbuild,
  publishContent,
  report,
  sitemap,
  staticNotFound,
  urlPath,
} from './postbuild.ts'

let root = ''
let client = ''
let log: ReturnType<typeof spyOn>
let error: ReturnType<typeof spyOn>

const THEME = 'document.documentElement.dataset.x="ihsaanly.theme"'
const LD = '{"@context":"https://schema.org"}'
const HYDRATE = 'window.$_TSR={a:1}'

function write(path: string, content: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
}

function page(...scripts: string[]): string {
  return `<!doctype html><html><head><link rel="modulepreload" href="/assets/app.js">${scripts.join('')}</head><body></body></html>`
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'postbuild-'))
  client = join(root, 'dist', 'client')
  write(
    join(client, 'index.html'),
    page(`<script>${THEME}</script>`, `<script>${HYDRATE}</script>`),
  )
  write(join(client, 'ar', 'index.html'), page(`<script>${THEME}</script>`))
  write(
    join(client, '404.html'),
    page(
      `<script>${THEME}</script>`,
      `<script type="application/ld+json">${LD}</script>`,
      `<script type="module" src="/assets/app.js"></script>`,
      `<script>${HYDRATE}</script>`,
    ),
  )
  write(join(client, '404', 'index.html'), page())
  write(join(client, 'assets', 'ignored.html'), page())
  write(join(client, '__tsr', 'ignored.html'), page())
  log = spyOn(console, 'log').mockImplementation(() => {})
  error = spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  log.mockRestore()
  error.mockRestore()
  rmSync(root, { recursive: true, force: true })
})

describe('htmlFiles and urlPath', () => {
  test('finds the pages, not the assets or the server-function cache', () => {
    const found = htmlFiles(client).map((file) => urlPath(client, file))
    expect(found.sort()).toEqual(['/404.html', '/404/', '/', '/ar/'].sort())
  })

  test('maps a file to the URL the host serves it at', () => {
    expect(urlPath(client, join(client, 'legal', 'terms', 'index.html'))).toBe('/legal/terms/')
    expect(urlPath(client, join(client, '404.html'))).toBe('/404.html')
    expect(urlPath(client, join(client, 'index.html'))).toBe('/')
  })
})

describe('staticNotFound', () => {
  test('keeps only the theme script and JSON, and drops the module preloads', () => {
    staticNotFound(client)
    const html = readFileSync(join(client, '404.html'), 'utf8')
    expect(html).not.toContain('modulepreload')
    expect(html).not.toContain(HYDRATE)
    expect(html).not.toContain('src="/assets/app.js"')
    expect(html).toContain(THEME)
    expect(html).toContain(LD)
  })
})

describe('policies', () => {
  test('gives each page the policy for its own inline scripts, and the 404 page is the fallback', () => {
    staticNotFound(client)
    const problems: string[] = []
    const map = policies(client, 'production', problems)
    expect(problems).toEqual([])
    expect(Object.keys(map.pages).sort()).toEqual(['/', '/404.html', '/404/', '/ar/'])
    expect(map.pages['/']).toContain(cspHash(HYDRATE))
    expect(map.pages['/ar/']).not.toContain(cspHash(HYDRATE))
    expect(map.fallback).toBe(map.pages['/404.html'] ?? '')
    expect(map.headers).toBeUndefined()
  })

  test('a development build also sends X-Robots-Tag', () => {
    expect(policies(client, 'development', []).headers).toEqual({
      'X-Robots-Tag': DEVELOPMENT_ROBOTS,
    })
  })

  test('reports a style attribute the policy would block', () => {
    write(join(client, 'bad', 'index.html'), '<html><body><p style="color:red">x</p></body></html>')
    const problems: string[] = []
    policies(client, 'production', problems)
    expect(problems).toEqual(['/bad/: a style attribute the CSP blocks'])
  })

  test('without a 404 page there is no fallback to give', () => {
    rmSync(join(client, '404.html'))
    expect(() => policies(client, 'production', [])).toThrow('dist/client/404.html is missing')
  })
})

describe('sitemap', () => {
  const xml = sitemap()

  test('lists every page in every language once', () => {
    expect(xml.match(/<url>/g)).toHaveLength(Object.keys(PAGES).length * LOCALES.length)
    expect(xml).toContain('<loc>https://ihsaanly.app/</loc>')
    expect(xml).toContain('<loc>https://ihsaanly.app/ar/legal/terms/</loc>')
  })

  test('each URL names every language and x-default as alternates', () => {
    const first = xml.slice(xml.indexOf('<url>'), xml.indexOf('</url>'))
    expect(first.match(/hreflang=/g)).toHaveLength(LOCALES.length + 1)
    expect(first).toContain('hreflang="x-default" href="https://ihsaanly.app/"')
    expect(first).toContain('hreflang="zh-Hant-HK"')
  })

  test('is a well-formed urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true)
  })
})

describe('flatten', () => {
  test('joins nested keys with dots and skips notes', () => {
    const flat = flatten({ a: { b: 'x', b_comment: 'note', c: { d: 'y' } }, _comment: 'z', e: 'w' })
    expect([...flat]).toEqual([
      ['a.b', 'x'],
      ['a.c.d', 'y'],
      ['e', 'w'],
    ])
  })

  test('ignores anything that is not an object', () => {
    expect(flatten('text').size).toBe(0)
    expect(flatten(null).size).toBe(0)
  })
})

describe('report', () => {
  test('says which languages are complete, incomplete or absent', () => {
    const messages = join(root, 'messages')
    write(join(messages, 'en.json'), JSON.stringify({ a: 'one', b: { c: 'two' } }))
    write(join(messages, 'fr.json'), JSON.stringify({ a: 'un', b: { c: 'deux' } }))
    write(join(messages, 'ar.json'), JSON.stringify({ a: 'واحد', b: { c: '  ' } }))
    const lines = report(messages)
    expect(lines).toHaveLength(LOCALES.length)
    expect(lines.find((line) => line.startsWith('  fr '))).toContain('complete')
    expect(lines.find((line) => line.startsWith('  ar '))).toContain('1 missing (b.c)')
    expect(lines.find((line) => line.startsWith('  ja '))).toContain('no file, English throughout')
  })

  test('with no English file everything counts as missing nothing', () => {
    expect(report(join(root, 'nowhere'))[0]).toContain('no file')
  })
})

describe('postbuild', () => {
  test('writes the Apache and Netlify headers, the sitemap and headers.json', () => {
    const problems = postbuild(root, 'production')
    expect(problems).toEqual([])
    expect(existsSync(join(client, '404'))).toBe(false)
    const map = JSON.parse(readFileSync(join(root, 'dist', 'headers.json'), 'utf8')) as HeaderMap
    expect(Object.keys(map.pages).sort()).toEqual(['/', '/404.html', '/ar/'])
    expect(readFileSync(join(client, '.htaccess'), 'utf8')).toContain(
      (map.pages['/ar/'] ?? '').replaceAll('"', '\\"'),
    )
    expect(readFileSync(join(client, '_headers'), 'utf8')).toContain(map.pages['/'] ?? '')
    expect(readFileSync(join(client, 'sitemap.xml'), 'utf8')).toContain('<urlset')
    expect(log).toHaveBeenCalledWith('postbuild: 3 pages, each with its own CSP (production)')
  })

  test('production leaves robots.txt alone and sends no noindex', () => {
    postbuild(root, 'production')
    expect(existsSync(join(client, 'robots.txt'))).toBe(false)
    expect(readFileSync(join(client, '.htaccess'), 'utf8')).not.toContain('X-Robots-Tag')
  })

  test('a development build blocks every crawler', () => {
    postbuild(root, 'development')
    expect(readFileSync(join(client, 'robots.txt'), 'utf8')).toBe('User-agent: *\nDisallow: /\n')
    expect(readFileSync(join(client, '.htaccess'), 'utf8')).toContain(DEVELOPMENT_ROBOTS)
    expect(readFileSync(join(client, '_headers'), 'utf8')).toContain(DEVELOPMENT_ROBOTS)
    expect(readFileSync(join(root, 'dist', 'headers.json'), 'utf8')).toContain('X-Robots-Tag')
  })

  test('returns what it found wrong, and prints it', () => {
    write(join(client, 'bad', 'index.html'), '<p style="color:red">x</p>')
    expect(postbuild(root, 'production')).toEqual(['/bad/: a style attribute the CSP blocks'])
    expect(error).toHaveBeenCalledWith('  /bad/: a style attribute the CSP blocks')
  })
})

describe('publishContent', () => {
  const bundle = {
    manifest: {
      schemaVersion: 1,
      version: '0123456789ab',
      publishedAt: '2026-10-03T12:00:00.000Z',
      items: 'v0123456789ab/items.json',
      glossary: 'v0123456789ab/glossary.json',
      translations: { fr: 'v0123456789ab/translations/fr.json' },
    },
    files: {
      'v0123456789ab/items.json': '{"items":[]}',
      'v0123456789ab/glossary.json': '{"terms":[]}',
      'v0123456789ab/translations/fr.json': '{"language":"fr"}',
    },
  }

  test('writes the manifest and the one version folder it names, and nothing older', () => {
    write(join(client, 'content', 'vffffffffffff', 'items.json'), '{}')
    publishContent(client, bundle)
    const content = join(client, 'content')
    expect(JSON.parse(readFileSync(join(content, 'manifest.json'), 'utf8'))).toEqual(
      bundle.manifest,
    )
    for (const [path, text] of Object.entries(bundle.files))
      expect(readFileSync(join(content, path), 'utf8')).toBe(text)
    expect(existsSync(join(content, 'vffffffffffff'))).toBe(false)
    expect(log).toHaveBeenCalledWith('content: v0123456789ab, 3 files at /content/')
  })

  test('publishes packages/core/content by default', () => {
    publishContent(client)
    const manifest = ContentManifest.parse(
      JSON.parse(readFileSync(join(client, 'content', 'manifest.json'), 'utf8')),
    )
    expect(existsSync(join(client, 'content', manifest.items))).toBe(true)
    expect(Object.keys(manifest.translations).length).toBeGreaterThan(0)
  })
})

describe('content headers', () => {
  test('every header file lets any origin read /content/, revalidates the manifest and keeps versions forever', () => {
    postbuild(root, 'production')
    const map = JSON.parse(readFileSync(join(root, 'dist', 'headers.json'), 'utf8')) as HeaderMap
    expect(map.paths).toEqual(CONTENT_HEADERS)
    expect(CONTENT_HEADERS['/content/manifest.json']).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
    })
    expect(CONTENT_HEADERS['/content/:version/*']?.['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    )
    const htaccess = readFileSync(join(client, '.htaccess'), 'utf8')
    expect(htaccess).toContain('<If "%{REQUEST_URI} =~ m#^/content/manifest\\.json$#">')
    expect(htaccess).toContain('<If "%{REQUEST_URI} =~ m#^/content/[^/]+/.*$#">')
    expect(htaccess).toContain('Header always set Access-Control-Allow-Origin "*"')
    const netlify = readFileSync(join(client, '_headers'), 'utf8')
    expect(netlify).toContain('/content/manifest.json\n  Access-Control-Allow-Origin: *')
    expect(netlify).toContain('/content/:version/*\n  Access-Control-Allow-Origin: *')
  })
})

describe('cli', () => {
  test('exits 0 for a good build and 1 when there are problems', () => {
    expect(cli(root, 'production')).toBe(0)
    write(join(client, 'bad', 'index.html'), '<p style="color:red">x</p>')
    expect(cli(root, 'production')).toBe(1)
  })
})
