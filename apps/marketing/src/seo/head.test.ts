import { describe, expect, test } from 'bun:test'
import { LOCALES, localeFor, PAGES } from '~/i18n/locales'
import { catalogue } from '~/i18n/messages.server'
import { notFoundHead, pageHead } from './head'

const english = catalogue('en').strings

function metaContent(
  head: ReturnType<typeof pageHead>,
  key: 'name' | 'property',
  value: string,
): string | undefined {
  return head.meta.find((entry) => entry[key] === value)?.content
}

describe('pageHead', () => {
  test('home page: title, descriptions, canonical, share tags', () => {
    const head = pageHead(PAGES.home, localeFor('en'), english)
    expect(head.meta[0]).toEqual({ title: english['home.title'] ?? '' })
    expect(metaContent(head, 'name', 'description')).toBeTruthy()
    expect(metaContent(head, 'property', 'og:url')).toBe('https://ihsaanly.app/')
    expect(metaContent(head, 'property', 'og:locale')).toBe('en_US')
    expect(metaContent(head, 'property', 'og:image')).toBe('https://ihsaanly.app/assets/og-en.png')
    expect(metaContent(head, 'property', 'og:description')).toBe(
      english['home.shareDescription']?.replace(/<[^>]+>/g, ''),
    )
    expect(metaContent(head, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(head.links[0]).toEqual({ rel: 'canonical', href: 'https://ihsaanly.app/' })
  })

  test('lists every language as an alternate, plus x-default pointing at English', () => {
    const head = pageHead(PAGES.privacy, localeFor('fr'), catalogue('fr').strings)
    const alternates = head.links.filter((link) => link.rel === 'alternate')
    expect(alternates).toHaveLength(LOCALES.length + 1)
    expect(alternates.find((link) => link.hrefLang === 'x-default')?.href).toBe(
      'https://ihsaanly.app/legal/privacy/',
    )
    expect(alternates.find((link) => link.hrefLang === 'fr')?.href).toBe(
      'https://ihsaanly.app/fr/legal/privacy/',
    )
    expect(head.links[0]?.href).toBe('https://ihsaanly.app/fr/legal/privacy/')
  })

  test('a legal page shares its own description and carries no JSON-LD', () => {
    const head = pageHead(PAGES.terms, localeFor('en'), english)
    expect(metaContent(head, 'property', 'og:description')).toBe(
      metaContent(head, 'name', 'description'),
    )
    expect(head.scripts).toEqual([])
  })

  test('only Arabic preloads the Amiri font', () => {
    const preload = (code: 'ar' | 'en'): Record<string, string>[] =>
      pageHead(PAGES.home, localeFor(code), catalogue(code).strings).links.filter(
        (link) => link.rel === 'preload',
      )
    expect(preload('en')).toEqual([])
    expect(preload('ar')).toEqual([
      expect.objectContaining({ rel: 'preload', as: 'font', type: 'font/woff2' }),
    ])
  })

  test('a missing string shows its key rather than nothing', () => {
    const head = pageHead(PAGES.home, localeFor('en'), {})
    expect(head.meta[0]).toEqual({ title: 'home.title' })
  })

  test('the home page carries JSON-LD for the org, the apps and the languages', () => {
    const head = pageHead(PAGES.home, localeFor('ar'), catalogue('ar').strings)
    expect(head.scripts).toHaveLength(1)
    const script = head.scripts[0]
    expect(script?.type).toBe('application/ld+json')
    const graph = JSON.parse(script?.children ?? '{}')
    expect(graph['@context']).toBe('https://schema.org')
    const types = graph['@graph'].map((node: { '@type': string }) => node['@type'])
    expect(types).toEqual(['Organization', 'MobileApplication', 'WebApplication'])
    expect(graph['@graph'][1].url).toBe('https://ihsaanly.app/ar/')
    expect(graph['@graph'][1].inLanguage).toEqual(LOCALES.map((locale) => locale.lang))
  })

  test('JSON-LD never contains a raw "<"', () => {
    const strings = { ...english, 'home.description': 'a </script><b>' }
    const json = pageHead(PAGES.home, localeFor('en'), strings).scripts[0]?.children ?? ''
    expect(json).not.toContain('<')
    expect(JSON.parse(json)['@graph'][1].description).toBe('a ')
  })
})

describe('notFoundHead', () => {
  test('is not indexed and carries no Open Graph tags', () => {
    const head = notFoundHead(english)
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex' })
    expect(head.meta.some((entry) => entry.property?.startsWith('og:'))).toBe(false)
    expect(head.links).toEqual([])
    expect(head.scripts).toEqual([])
  })
})
