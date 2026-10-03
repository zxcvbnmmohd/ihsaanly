import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { sqlite } from '../../test/native'
import { resetStorage } from '../../test/storage'

const core = await import('@ihsaanly/core/content')
const { default: english } = await import('@ihsaanly/core/content/items.json')
const { default: glossary } = await import('@ihsaanly/core/content/glossary.json')
const backend = await import('../storage/backend')
const { buildExport } = await import('../data/export')
const { SYNCED_KEYS } = await import('../cloud/keys')
const cache = await import('./cache')
const { CONTENT_SCHEMA_VERSION } = await import('@ihsaanly/core/content/bundle')

const [first, ...rest] = english.items
if (!first) throw new Error('no items')
const renamed = {
  ...english,
  items: [{ ...first, title: { ...first.title, en: 'Cached title' } }, ...rest],
}
const french = { language: 'fr', items: { [first.id]: { title: 'Titre en cache' } }, glossary: {} }

function save(): boolean {
  return cache.saveCachedContent({
    version: 'aaaaaaaaaaaa',
    language: 'fr',
    items: renamed,
    glossary,
    translations: { fr: french },
  })
}

describe('the content cache', () => {
  beforeEach(() => {
    resetStorage()
    cache.clearCachedContent()
    backend.removeContentRow('checkedAt')
  })
  afterEach(() => core.resetContent())

  it('round-trips a bundle and installs it', () => {
    expect(cache.loadCachedContent()).toBeNull()
    expect(cache.installCachedContent()).toBe(false)

    expect(save()).toBe(true)
    expect(cache.cachedSummary()).toEqual({ version: 'aaaaaaaaaaaa', language: 'fr' })
    expect(cache.loadCachedContent()?.translations).toEqual({ fr: french })

    expect(cache.installCachedContent()).toBe(true)
    expect(core.itemById(first.id)?.title.en).toBe('Cached title')
    expect(core.itemById(first.id)?.title.fr).toBe('Titre en cache')
  })

  it('ignores a cache that is unreadable, of another schema, or from a build that shipped other content', () => {
    const stored = (overrides: Record<string, unknown>): string =>
      JSON.stringify({
        schemaVersion: CONTENT_SCHEMA_VERSION,
        version: 'aaaaaaaaaaaa',
        shipped: core.shippedContentFingerprint(),
        language: 'en',
        items: renamed,
        glossary,
        translations: {},
        ...overrides,
      })

    const cases = [
      '{not json',
      '{"version":1}',
      stored({ schemaVersion: CONTENT_SCHEMA_VERSION - 1 }),
      stored({ shipped: 'an older build' }),
    ]
    cases.forEach((raw) => {
      backend.writeContentRow('bundle', raw)
      expect(cache.loadCachedContent()).toBeNull()
      expect(cache.cachedSummary()).toBeNull()
      expect(cache.installCachedContent()).toBe(false)
    })

    backend.writeContentRow('bundle', stored({}))
    expect(cache.loadCachedContent()?.version).toBe('aaaaaaaaaaaa')
  })

  it('removes a cache whose documents fail their schemas, keeping the shipped content', () => {
    cache.saveCachedContent({
      version: 'bbbbbbbbbbbb',
      language: 'en',
      items: { ...renamed, schemaVersion: 9 },
      glossary,
      translations: {},
    })
    const before = core.items

    expect(cache.installCachedContent()).toBe(false)
    expect(core.items).toBe(before)
    expect(backend.readContentRow('bundle')).toBeNull()
    expect(cache.cachedSummary()).toBeNull()
  })

  it('keeps the previous bundle when a write fails', () => {
    save()
    sqlite.db.exec('ALTER TABLE content_cache RENAME TO content_cache_away')
    try {
      expect(save()).toBe(false)
    } finally {
      sqlite.db.exec('ALTER TABLE content_cache_away RENAME TO content_cache')
    }
    expect(cache.cachedSummary()?.version).toBe('aaaaaaaaaaaa')
    expect(cache.loadCachedContent()?.version).toBe('aaaaaaaaaaaa')
  })

  it('remembers when a check last reached the server', () => {
    expect(cache.lastContentCheck()).toBe(0)
    cache.recordContentCheck(1_234)
    expect(cache.lastContentCheck()).toBe(1_234)
    backend.writeContentRow('checkedAt', 'garbage')
    expect(cache.lastContentCheck()).toBe(0)
  })

  it('stays on the device: never a preference, so never exported or synced', () => {
    save()
    cache.recordContentCheck(1)
    const exported = JSON.stringify(buildExport())
    expect(exported).not.toContain('Cached title')
    expect(backend.allPreferenceRows().map((row) => row.key)).not.toContain('bundle')
    expect([...SYNCED_KEYS].some((key) => key.toLowerCase().includes('content'))).toBe(false)
  })

  it('keeps one language: a whole bundle in a small slice of the ~5 MB web storage', () => {
    save()
    const size = backend.readContentRow('bundle')?.length ?? 0
    expect(size).toBeGreaterThan(50_000)
    expect(size).toBeLessThan(250_000)
  })

  it('survives a wipe of the user data', () => {
    save()
    backend.wipe()
    expect(cache.loadCachedContent()?.version).toBe('aaaaaaaaaaaa')
  })
})
