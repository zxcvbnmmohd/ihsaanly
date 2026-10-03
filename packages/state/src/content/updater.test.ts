import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { resetStorage } from '../../test/storage'
import type { ContentCheckResult } from './updater'

const core = await import('@ihsaanly/core/content')
const { bundlePaths } = await import('@ihsaanly/core/content/bundle')
const { default: english } = await import('@ihsaanly/core/content/items.json')
const { default: glossary } = await import('@ihsaanly/core/content/glossary.json')
const backend = await import('../storage/backend')
const { recentFailures } = await import('../storage/log')
const cache = await import('./cache')
const updater = await import('./updater')

const BASE = 'https://example.test/content/'
const V1 = '111111111111'
const V2 = '222222222222'

const [maybeFirst, ...rest] = english.items
if (!maybeFirst) throw new Error('no items')
const first = maybeFirst

function itemsTitled(title: string): unknown {
  return { ...english, items: [{ ...first, title: { ...first.title, en: title } }, ...rest] }
}

function translation(language: string, title: string): unknown {
  return { language, items: { [first.id]: { title } }, glossary: {} }
}

function manifest(version: string, overrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    version,
    publishedAt: '2026-10-01T00:00:00.000Z',
    ...bundlePaths(version, ['fr', 'ar']),
    ...overrides,
  }
}

/** A server: path (under BASE) → body, or a number for an error status. */
let files: Record<string, unknown> = {}
let requests: { url: string; cache: RequestCache | undefined }[] = []

const serve = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input)
  requests.push({ url, cache: init?.cache })
  const path = url.replace('https://example.test/content/', '')
  const body = files[path]
  if (body === undefined) return new Response('missing', { status: 404 })
  if (typeof body === 'number') return new Response('error', { status: body })
  if (body instanceof Error) throw body
  return new Response(typeof body === 'string' ? body : JSON.stringify(body))
}) as typeof fetch

function publish(version: string, title: string, frTitle = 'Titre'): void {
  const paths = bundlePaths(version, ['fr', 'ar'])
  files = {
    'manifest.json': manifest(version),
    [paths.items]: itemsTitled(title),
    [paths.glossary]: glossary,
    [paths.translations.fr ?? '']: translation('fr', frTitle),
    [paths.translations.ar ?? '']: translation('ar', 'عنوان'),
  }
}

const check = (language = 'en', options = {}): Promise<ContentCheckResult> =>
  updater.checkForContentUpdate(BASE, language, { fetch: serve, now: () => 5_000, ...options })

function installed(): string | undefined {
  cache.installCachedContent()
  return core.itemById(first.id)?.title.en
}

describe('checking for a content update', () => {
  beforeEach(() => {
    resetStorage()
    cache.clearCachedContent()
    backend.removeContentRow('checkedAt')
    files = {}
    requests = []
  })
  afterEach(() => core.resetContent())

  it('downloads a new version for the next open, asking for the manifest uncached', async () => {
    publish(V1, 'Version one')
    expect(await check()).toBe('updated')

    expect(requests[0]).toEqual({ url: `${BASE}manifest.json`, cache: 'no-cache' })
    expect(requests.map((request) => request.url)).toEqual([
      `${BASE}manifest.json`,
      `${BASE}v${V1}/items.json`,
      `${BASE}v${V1}/glossary.json`,
    ])
    expect(cache.lastContentCheck()).toBe(5_000)
    // Nothing on screen changes until the next start installs it.
    expect(core.itemById(first.id)?.title.en).toBe(first.title.en)
    expect(installed()).toBe('Version one')
  })

  it('does nothing more when the published version is the cached one', async () => {
    publish(V1, 'Version one')
    await check()
    requests = []
    expect(await check()).toBe('current')
    expect(requests).toHaveLength(1)
  })

  it('replaces the cache when a newer version is published', async () => {
    publish(V1, 'Version one')
    await check()
    publish(V2, 'Version two')
    expect(await check()).toBe('updated')
    expect(installed()).toBe('Version two')
  })

  it('keeps only the active language, and fetches another language for the same version', async () => {
    publish(V1, 'Version one', 'Version un')
    expect(await check('fr-FR')).toBe('updated')
    expect(cache.loadCachedContent()?.translations).toEqual({
      fr: translation('fr', 'Version un'),
    })
    cache.installCachedContent()
    expect(core.itemById(first.id)?.title.fr).toBe('Version un')

    requests = []
    expect(await check('ar')).toBe('updated')
    // Same version: only the translation is new.
    expect(requests.map((request) => request.url)).toEqual([
      `${BASE}manifest.json`,
      `${BASE}v${V1}/translations/ar.json`,
    ])
    expect(Object.keys(cache.loadCachedContent()?.translations ?? {})).toEqual(['ar'])
    expect(cache.cachedSummary()).toEqual({ version: V1, language: 'ar' })
  })

  it('ignores a manifest for another schema version, keeping what it has', async () => {
    publish(V1, 'Version one')
    await check()
    files['manifest.json'] = manifest(V2, { schemaVersion: 2, items: 'anything' })
    expect(await check()).toBe('skipped')
    expect(installed()).toBe('Version one')

    files['manifest.json'] = null
    expect(await check()).toBe('skipped')
  })

  it('rejects a bundle that fails validation, and notes it', async () => {
    publish(V1, 'Version one')
    await check()

    publish(V2, 'Version two')
    files[`v${V2}/items.json`] = { ...english, schemaVersion: 7 }
    expect(await check()).toBe('failed')
    expect(installed()).toBe('Version one')
    expect(recentFailures().at(-1)?.label).toBe('contentUpdate')

    publish(V2, 'Version two')
    files[`v${V2}/translations/fr.json`] = translation('ar', 'wrong language')
    expect(await check('fr')).toBe('failed')

    files['manifest.json'] = manifest(V2, { items: '../elsewhere.json' })
    expect(await check()).toBe('failed')

    files['manifest.json'] = '{truncated'
    expect(await check()).toBe('failed')
    expect(installed()).toBe('Version one')
  })

  it('fails quietly when offline, unreachable, erroring or slow', async () => {
    publish(V1, 'Version one')

    files['manifest.json'] = new TypeError('Network request failed')
    expect(await check()).toBe('failed')

    files['manifest.json'] = 503
    expect(await check()).toBe('failed')

    publish(V1, 'Version one')
    delete files[`v${V1}/glossary.json`]
    expect(await check()).toBe('failed')

    const hanging = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch
    expect(await check('en', { fetch: hanging, timeoutMs: 5 })).toBe('failed')

    const navigatorBefore = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
    try {
      requests = []
      expect(await check()).toBe('failed')
      expect(requests).toHaveLength(0)
    } finally {
      if (navigatorBefore) Object.defineProperty(globalThis, 'navigator', navigatorBefore)
    }

    expect(cache.loadCachedContent()).toBeNull()
    expect(cache.lastContentCheck()).toBe(0)
    // Network trouble is not a failure worth keeping.
    expect(recentFailures().some((entry) => entry.label === 'contentUpdate')).toBe(false)
  })

  it('reports a cache it could not write', async () => {
    publish(V1, 'Version one')
    const { sqlite } = await import('../../test/native')
    sqlite.db.exec('ALTER TABLE content_cache RENAME TO content_cache_away')
    try {
      expect(await check()).toBe('failed')
    } finally {
      sqlite.db.exec('ALTER TABLE content_cache_away RENAME TO content_cache')
    }
  })

  it('uses the global fetch and clock by default', async () => {
    const before = globalThis.fetch
    globalThis.fetch = serve
    try {
      publish(V1, 'Version one')
      expect(await updater.checkForContentUpdate(BASE, 'en')).toBe('updated')
      expect(cache.lastContentCheck()).toBeGreaterThan(5_000)
    } finally {
      globalThis.fetch = before
    }
  })
})

describe('scheduling checks', () => {
  let clock = 0
  let language = 'en'
  let stop: () => void = () => {}

  const start = (base: string | undefined = BASE, delayMs = 0): void => {
    stop = updater.startContentUpdates(base, () => language, {
      fetch: serve,
      now: () => clock,
      delayMs,
    })
  }

  beforeEach(() => {
    resetStorage()
    cache.clearCachedContent()
    backend.removeContentRow('checkedAt')
    requests = []
    clock = 10 * updater.CHECK_INTERVAL_MS
    language = 'en'
    publish(V1, 'Version one')
  })
  afterEach(() => {
    stop()
    core.resetContent()
  })

  it('never checks without a content URL', async () => {
    start(undefined)
    stop()
    start('  ')
    expect(await updater.checkContentIfDue()).toBe('skipped')
    updater.notifyContentForeground()
    expect(requests).toHaveLength(0)
  })

  it('checks shortly after startup', async () => {
    start(BASE, 1)
    await Bun.sleep(20)
    expect(requests.length).toBeGreaterThan(0)
    expect(cache.cachedSummary()?.version).toBe(V1)
  })

  it('stopping before the first check cancels it', async () => {
    start(BASE, 5)
    stop()
    await Bun.sleep(20)
    expect(requests).toHaveLength(0)
  })

  it('checks at most every six hours, one at a time', async () => {
    start(BASE, 60_000)
    const [one, two] = [updater.checkContentIfDue(), updater.checkContentIfDue()]
    expect(one).toBe(two)
    expect(await one).toBe('updated')

    clock += updater.CHECK_INTERVAL_MS - 1
    expect(await updater.checkContentIfDue()).toBe('skipped')

    clock += 1
    publish(V2, 'Version two')
    updater.notifyContentForeground()
    await Bun.sleep(5)
    expect(cache.cachedSummary()?.version).toBe(V2)
  })

  it('checks straight away after a language change, for its translation', async () => {
    start(BASE, 60_000)
    await updater.checkContentIfDue()
    expect(await updater.checkContentIfDue()).toBe('skipped')

    language = 'fr'
    expect(await updater.checkContentIfDue()).toBe('updated')
    expect(cache.cachedSummary()).toEqual({ version: V1, language: 'fr' })
  })
})
