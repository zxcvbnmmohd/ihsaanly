import { installContent, shippedContentFingerprint } from '@ihsaanly/core/content'
import { CONTENT_SCHEMA_VERSION } from '@ihsaanly/core/content/bundle'
import { z } from 'zod'

import { readContentRow, removeContentRow, writeContentRow } from '../storage/backend'

/**
 * The last good content bundle this device downloaded, installed at the next
 * open (`installCachedContent`) instead of the content the app shipped with.
 *
 * It lives in its own storage area, not in `preferences`, so it is never
 * synced, exported or wiped with the user's data: it is public content, and
 * the next check fetches it again anyway. Only the English documents and the
 * active language's translation are kept (about 110 KB at most, well inside
 * the ~5 MB localStorage gives the web apps); every other language falls back
 * to the translation the app shipped with.
 */
const BUNDLE_KEY = 'bundle'
const CHECKED_KEY = 'checkedAt'

const ContentCache = z.object({
  schemaVersion: z.number(),
  version: z.string(),
  /** `shippedContentFingerprint()` of the build that downloaded it. */
  shipped: z.string(),
  /** The language it was fetched for; its translation, if there is one, is in `translations`. */
  language: z.string(),
  items: z.unknown(),
  glossary: z.unknown(),
  translations: z.record(z.string(), z.unknown()),
})

export type ContentCache = z.infer<typeof ContentCache>

/** What the updater needs to know about the cache without reading 100 KB again. */
export interface CachedSummary {
  version: string
  language: string
}

/** `undefined` until the cache is first read. */
let summary: CachedSummary | null | undefined

function summarise(cache: ContentCache | null): CachedSummary | null {
  return cache ? { version: cache.version, language: cache.language } : null
}

/**
 * The cached bundle, or null when there is none, it cannot be read, it was
 * written for another schema, or an app update has shipped different content
 * since it was downloaded (bundled content is the floor). Not validated
 * beyond its envelope: `installContent` parses the documents.
 */
export function loadCachedContent(): ContentCache | null {
  let cache: ContentCache | null = null
  try {
    const raw = readContentRow(BUNDLE_KEY)
    const parsed = raw === null ? null : ContentCache.safeParse(JSON.parse(raw))
    if (
      parsed?.success &&
      parsed.data.schemaVersion === CONTENT_SCHEMA_VERSION &&
      parsed.data.shipped === shippedContentFingerprint()
    ) {
      cache = parsed.data
    }
  } catch {
    cache = null
  }
  summary = summarise(cache)
  return cache
}

export function cachedSummary(): CachedSummary | null {
  return summary === undefined ? summarise(loadCachedContent()) : summary
}

/** One write, so the previous bundle stays whole if it fails. */
export function saveCachedContent(cache: Omit<ContentCache, 'shipped' | 'schemaVersion'>): boolean {
  const record: ContentCache = {
    ...cache,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    shipped: shippedContentFingerprint(),
  }
  const saved = writeContentRow(BUNDLE_KEY, JSON.stringify(record))
  if (saved) summary = summarise(record)
  return saved
}

export function clearCachedContent(): void {
  removeContentRow(BUNDLE_KEY)
  summary = null
}

/** When an update check last reached the server (ms), or 0. */
export function lastContentCheck(): number {
  const at = Number(readContentRow(CHECKED_KEY))
  return Number.isFinite(at) ? at : 0
}

export function recordContentCheck(at: number): void {
  writeContentRow(CHECKED_KEY, String(at))
}

/**
 * Installs the cached bundle, if there is a good one. Synchronous: call it at
 * startup before the first screen renders. A cache that fails its schemas is
 * removed so the next check downloads a fresh one; the app keeps what it
 * shipped with.
 */
export function installCachedContent(): boolean {
  const cache = loadCachedContent()
  if (!cache) return false
  const installed = installContent({
    items: cache.items,
    glossary: cache.glossary,
    translations: Object.values(cache.translations),
  })
  if (!installed) clearCachedContent()
  return installed
}
