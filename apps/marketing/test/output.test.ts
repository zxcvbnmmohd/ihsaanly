// The build writes every page the old site had, at the same URLs, with the
// language, direction and head tags search engines already index.
import { describe, expect, spyOn, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT_SCHEMA_VERSION, ContentManifest } from '@ihsaanly/core/content/bundle'
import { buildContentBundle } from '@ihsaanly/core/content/bundle-build'
import { ContentDocument, GlossaryDocument } from '@ihsaanly/core/content/schema'
import { TranslationFile } from '@ihsaanly/core/content/translations'
import { resolveAppEnv } from '@ihsaanly/web/app-env'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { serve } from '@ihsaanly/web/hosting/serve'
import { absolute, LOCALES, PAGES, pageUrl } from '../src/i18n/locales.ts'

const CLIENT = join(import.meta.dir, '..', 'dist', 'client')

function read(path: string): string {
  return readFileSync(join(CLIENT, path.endsWith('/') ? `${path}index.html` : path), 'utf8')
}

describe('pages', () => {
  for (const page of Object.values(PAGES)) {
    for (const locale of LOCALES) {
      const path = pageUrl(locale, page.path)
      test(path, () => {
        const html = read(path)
        expect(html).toContain(`<html lang="${locale.lang}" dir="${locale.dir}"`)
        expect(html).toContain(`<link rel="canonical" href="${absolute(path)}"/>`)
        for (const each of LOCALES) {
          expect(html).toContain(
            `hrefLang="${each.hreflang}" href="${absolute(pageUrl(each, page.path))}"`,
          )
        }
        expect(html).toContain('hrefLang="x-default"')
        expect(html.match(/og:locale:alternate/g)?.length).toBe(LOCALES.length - 1)
        expect(html.match(/<meta name="theme-color"/g)?.length).toBe(2)
        expect(html.includes('application/ld+json')).toBe(page.id === 'home')
      })
    }
  }
})

describe('site files', () => {
  test('404 is not indexed', () => {
    expect(read('/404.html')).toContain('<meta name="robots" content="noindex"/>')
    expect(existsSync(join(CLIENT, '404'))).toBe(false)
    // Served at any unknown URL, so it must not hydrate against the wrong route.
    expect(read('/404.html')).not.toContain('type="module"')
  })

  test('sitemap lists every page in every language', () => {
    expect(read('/sitemap.xml').match(/<loc>/g)?.length).toBe(
      Object.keys(PAGES).length * LOCALES.length,
    )
  })

  test('robots, manifest and icons are copied', () => {
    for (const file of ['robots.txt', 'site.webmanifest', 'assets/og.png', 'assets/star.svg']) {
      expect(existsSync(join(CLIENT, file))).toBe(true)
    }
  })

  test('server-function data is static JSON', () => {
    expect(existsSync(join(CLIENT, '__tsr', 'staticServerFnCache'))).toBe(true)
  })
})

// The build and these tests run in one `bun run build`, so VITE_APP_ENV says
// which of the two this output must be (the helpers themselves are covered in
// packages/web/src/app-env.test.ts).
describe(`a ${resolveAppEnv(process.env.VITE_APP_ENV)} build`, () => {
  const development = resolveAppEnv(process.env.VITE_APP_ENV) === 'development'
  const headerMap: HeaderMap = JSON.parse(readFileSync(join(CLIENT, '..', 'headers.json'), 'utf8'))

  test(development ? 'is never indexed' : 'is indexed as normal', () => {
    const home = read('/')
    expect(home.includes('<meta name="robots" content="noindex, nofollow"/>')).toBe(development)
    expect(home.includes('aria-label="Development build"')).toBe(development)
    const robots = read('/robots.txt')
    expect(robots.includes('Disallow: /')).toBe(development)
    expect(robots.includes('Sitemap:')).toBe(!development)
    expect(read('/.htaccess').includes('X-Robots-Tag')).toBe(development)
    expect(read('/_headers').includes('X-Robots-Tag: noindex, nofollow')).toBe(development)
    expect(headerMap.headers?.['X-Robots-Tag']).toBe(development ? 'noindex, nofollow' : undefined)
  })
})

// The content the apps fetch for remote updates (scripts/postbuild.ts,
// publishContent): one valid version, served with the headers a
// cross-origin client needs.
describe('content updates', () => {
  const content = join(CLIENT, 'content')
  const manifest = ContentManifest.parse(
    JSON.parse(readFileSync(join(content, 'manifest.json'), 'utf8')),
  )
  const parse = (path: string): unknown => JSON.parse(readFileSync(join(content, path), 'utf8'))

  test('publishes the manifest and only the version it names', () => {
    expect(manifest.schemaVersion).toBe(CONTENT_SCHEMA_VERSION)
    expect(readdirSync(content).sort()).toEqual(['manifest.json', `v${manifest.version}`])
    expect(manifest.version).toBe(buildContentBundle().manifest.version)
  })

  test('every file it names passes the schema the client checks', () => {
    expect(ContentDocument.safeParse(parse(manifest.items)).success).toBe(true)
    expect(GlossaryDocument.safeParse(parse(manifest.glossary)).success).toBe(true)
    for (const [language, path] of Object.entries(manifest.translations))
      expect(TranslationFile.parse(parse(path)).language).toBe(language)
  })

  test('is served cross-origin, the manifest revalidated and the files kept forever', async () => {
    const log = spyOn(console, 'log').mockImplementation(() => {})
    const headerMap: HeaderMap = JSON.parse(
      readFileSync(join(CLIENT, '..', 'headers.json'), 'utf8'),
    )
    const server = serve({ root: CLIENT, headerMap, port: 0 })
    log.mockRestore()
    try {
      const get = (path: string): Promise<Response> =>
        fetch(`http://localhost:${server.port}/content/${path}`, {
          headers: { Origin: 'chrome-extension://abcdefghijklmnop' },
        })
      const first = await get('manifest.json')
      expect(first.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(first.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
      expect(first.headers.get('Cache-Control')).toBe('no-cache')
      const items = await get(manifest.items)
      expect(items.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(items.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
      expect(items.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    } finally {
      server.stop(true)
    }
  })
})
