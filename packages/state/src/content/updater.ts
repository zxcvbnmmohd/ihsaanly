import { parseContent } from '@ihsaanly/core/content'
import {
  CONTENT_MANIFEST_PATH,
  CONTENT_SCHEMA_VERSION,
  ContentManifest,
  contentUrl,
} from '@ihsaanly/core/content/bundle'

import { noteFailure } from '../storage/events'
import {
  cachedSummary,
  lastContentCheck,
  loadCachedContent,
  recordContentCheck,
  saveCachedContent,
} from './cache'

/**
 * Downloads newer content for the next open. Nothing here changes what is on
 * screen: a bundle is validated and cached, and `installCachedContent`
 * installs it at the next start. Independent of sign-in, and never loads the
 * cloud code. The only request is for public files; it carries nothing about
 * the person beyond what any request does.
 */

export type ContentCheckResult =
  /** A new bundle (or the current one's translation for another language) was cached. */
  | 'updated'
  /** The cache already holds the published version for this language. */
  | 'current'
  /** Not attempted, or a manifest this build does not understand. */
  | 'skipped'
  /** Offline, timed out, or a file that failed to download or to validate. */
  | 'failed'

export interface CheckOptions {
  fetch?: typeof fetch
  /** The whole check, every file included. */
  timeoutMs?: number
  now?: () => number
}

const DEFAULT_TIMEOUT_MS = 20_000
/** Foregrounds and opens within this of the last check that reached the server do nothing. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/** A file the server sent that does not hold what it should: noted, unlike network trouble. */
const INVALID = Symbol('invalid content')

function invalid(message: string): Error {
  return Object.assign(new Error(message), { [INVALID]: true })
}

function isInvalid(error: unknown): boolean {
  return error instanceof SyntaxError || (error instanceof Error && INVALID in error)
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** The content language of a locale or language: `zh-Hant` reads `zh`. */
function baseLanguage(language: string): string {
  return language.split('-')[0] ?? language
}

async function getJson(
  load: typeof fetch,
  url: string,
  signal: AbortSignal,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await load(url, { ...init, signal })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

/**
 * One check against `baseUrl` (the URL ending `/content`). Never throws.
 * Fetches the manifest uncached; when it names a version other than the
 * cached one, or the cache was made for another language, downloads that
 * version's documents and this language's translation, validates them all,
 * and replaces the cache in one write.
 */
export async function checkForContentUpdate(
  baseUrl: string,
  language: string,
  { fetch: load = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, now = Date.now }: CheckOptions = {},
): Promise<ContentCheckResult> {
  if (isOffline()) return 'failed'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const { signal } = controller
  const get = (path: string): Promise<unknown> => getJson(load, contentUrl(baseUrl, path), signal)

  try {
    const raw = await getJson(load, contentUrl(baseUrl, CONTENT_MANIFEST_PATH), signal, {
      cache: 'no-cache',
    })
    // Checked before the shape: a later schema may change the shape too.
    const schemaVersion = (raw as { schemaVersion?: unknown } | null)?.schemaVersion
    if (schemaVersion !== CONTENT_SCHEMA_VERSION) {
      recordContentCheck(now())
      return 'skipped'
    }
    const manifest = ContentManifest.safeParse(raw)
    if (!manifest.success) throw invalid('manifest.json does not match its schema')

    const lang = baseLanguage(language)
    const { version } = manifest.data
    const summary = cachedSummary()
    if (summary?.version === version && summary.language === lang) {
      recordContentCheck(now())
      return 'current'
    }

    const translationPath = manifest.data.translations[lang]
    // Same version, another language: only the translation is new.
    const cached = summary?.version === version ? loadCachedContent() : null
    const [items, glossary, translation] = await Promise.all([
      cached ? cached.items : get(manifest.data.items),
      cached ? cached.glossary : get(manifest.data.glossary),
      translationPath ? get(translationPath) : null,
    ])

    const translations = translation === null ? [] : [translation]
    const parsed = parseContent({ items, glossary, translations })
    if (!parsed) throw invalid(`version ${version} does not match its schemas`)
    if (parsed.translations.some((file) => file.language !== lang)) {
      throw invalid(`version ${version}: ${translationPath} is not "${lang}"`)
    }

    const saved = saveCachedContent({
      version,
      language: lang,
      items: parsed.items,
      glossary: parsed.glossary,
      translations: Object.fromEntries(parsed.translations.map((file) => [file.language, file])),
    })
    if (!saved) return 'failed'
    recordContentCheck(now())
    return 'updated'
  } catch (error) {
    // A server sending something broken is worth a line in diagnostics, and
    // is not fetched again until the next check is due. Being offline or
    // timing out is neither: the next foreground tries again.
    if (isInvalid(error)) {
      noteFailure('contentUpdate', error)
      recordContentCheck(now())
    }
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

interface Updates {
  baseUrl: string
  language: () => string
  options: CheckOptions
}

let updates: Updates | null = null
let running: Promise<ContentCheckResult> | null = null

/**
 * Checks when one is due: every `CHECK_INTERVAL_MS`, and straight away when
 * the language changed since the cache was made. One at a time.
 */
export function checkContentIfDue(): Promise<ContentCheckResult> {
  if (!updates) return Promise.resolve('skipped')
  if (running !== null) return running
  const { baseUrl, language, options } = updates
  const now = options.now ?? Date.now
  const summary = cachedSummary()
  const languageChanged = summary !== null && summary.language !== baseLanguage(language())
  if (!languageChanged && now() - lastContentCheck() < CHECK_INTERVAL_MS) {
    return Promise.resolve('skipped')
  }
  running = checkForContentUpdate(baseUrl, language(), options).finally(() => {
    running = null
  })
  return running
}

export interface StartOptions extends CheckOptions {
  /** How long after startup the first check waits, so it never competes with the first paint. */
  delayMs?: number
}

/**
 * Wires updates up once, after the first render. Without a `baseUrl` (a build
 * with no content URL configured) there are never any checks: the app shows
 * what it shipped with. Returns a stop function (tests, hot reload).
 */
export function startContentUpdates(
  baseUrl: string | undefined,
  language: () => string,
  { delayMs = 1_000, ...options }: StartOptions = {},
): () => void {
  const base = baseUrl?.trim()
  if (!base) return () => {}
  updates = { baseUrl: base, language, options }
  const timer = setTimeout(() => void checkContentIfDue(), delayMs)
  return (): void => {
    clearTimeout(timer)
    updates = null
  }
}

/** For apps to call when they come to the foreground, and after a language change. */
export function notifyContentForeground(): void {
  void checkContentIfDue()
}
