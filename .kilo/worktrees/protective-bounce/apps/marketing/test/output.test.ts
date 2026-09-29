// The build writes every page the old site had, at the same URLs, with the
// language, direction and head tags search engines already index.
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

  test('sitemap lists all 30 pages', () => {
    expect(read('/sitemap.xml').match(/<loc>/g)?.length).toBe(30)
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
