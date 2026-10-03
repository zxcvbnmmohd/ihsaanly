import { describe, expect, it } from 'bun:test'
import {
  bundlePaths,
  CONTENT_MANIFEST_PATH,
  CONTENT_SCHEMA_VERSION,
  ContentManifest,
  contentUrl,
} from './bundle'

const VERSION = '0123456789ab'
const manifest = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  version: VERSION,
  publishedAt: '2026-10-03T12:00:00.000Z',
  ...bundlePaths(VERSION, ['ar', 'fr']),
}

describe('ContentManifest', () => {
  it('accepts a manifest whose files sit in its own version folder', () => {
    expect(ContentManifest.parse(manifest)).toEqual({
      ...manifest,
      items: 'v0123456789ab/items.json',
      glossary: 'v0123456789ab/glossary.json',
      translations: {
        ar: 'v0123456789ab/translations/ar.json',
        fr: 'v0123456789ab/translations/fr.json',
      },
    })
  })

  it('refuses a path into another version folder', () => {
    const other = bundlePaths('ffffffffffff', ['fr'])
    const result = ContentManifest.safeParse({ ...manifest, ...other })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'items',
      'glossary',
      'translations.fr',
    ])
  })

  it('refuses paths that leave the content folder, and malformed fields', () => {
    for (const change of [
      { items: '../items.json' },
      { items: 'https://example.com/v0123456789ab/items.json' },
      { glossary: 'v0123456789ab/other.json' },
      { version: 'abc' },
      { publishedAt: 'yesterday' },
      { schemaVersion: 0 },
      { translations: { French: 'v0123456789ab/translations/fr.json' } },
    ]) {
      expect(ContentManifest.safeParse({ ...manifest, ...change }).success).toBe(false)
    }
  })
})

describe('CONTENT_SCHEMA_VERSION', () => {
  it('is 2, so an app built for 1 keeps its shipped content rather than lose the pause flags', () => {
    expect(CONTENT_SCHEMA_VERSION).toBe(2)
    expect(ContentManifest.safeParse({ ...manifest, schemaVersion: 2 }).success).toBe(true)
  })
})

describe('contentUrl', () => {
  it('joins a base with or without a trailing slash', () => {
    expect(contentUrl('https://ihsaanly.app/content', CONTENT_MANIFEST_PATH)).toBe(
      'https://ihsaanly.app/content/manifest.json',
    )
    expect(contentUrl('https://ihsaanly.app/content/', 'v0123456789ab/items.json')).toBe(
      'https://ihsaanly.app/content/v0123456789ab/items.json',
    )
  })
})
