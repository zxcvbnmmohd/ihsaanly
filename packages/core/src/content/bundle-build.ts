// Build time only (node:fs, node:crypto): never imported by an app. Reads the
// same sources the apps bundle, validates each against its schema, and returns
// the manifest and files the marketing build publishes under /content/.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { z } from 'zod'
import { bundlePaths, CONTENT_SCHEMA_VERSION, type ContentBundle, ContentManifest } from './bundle'
import { ContentDocument, GlossaryDocument } from './schema'
import { TranslationFile } from './translations'

/** packages/core/content: the one source of truth, authored in git. */
export const CONTENT_DIR = join(import.meta.dir, '..', '..', 'content')

export interface BuildContentBundleOptions {
  /** The content folder (items.json, glossary.json, translations/*.json). */
  dir?: string
  /** When it is published; only `manifest.publishedAt` depends on it. */
  now?: Date
}

function parse<T>(schema: z.ZodType<T>, name: string, text: string, problems: string[]): T | null {
  const parsed = schema.safeParse(JSON.parse(text))
  if (parsed.success) return parsed.data
  problems.push(
    ...parsed.error.issues.map(
      (issue) => `${name}: ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    ),
  )
  return null
}

/**
 * The bundle for the content in `dir`. Throws, listing every problem, when any
 * file fails its schema: a broken bundle must fail the build, never publish.
 * The version is the first 12 hex of a sha256 over each file's path and
 * canonical JSON, in path order, so the same content always has the same
 * version.
 */
export function buildContentBundle({
  dir = CONTENT_DIR,
  now = new Date(),
}: BuildContentBundleOptions = {}): ContentBundle {
  const problems: string[] = []
  const read = (path: string): string => readFileSync(join(dir, path), 'utf8')

  const items = parse(ContentDocument, 'items.json', read('items.json'), problems)
  const glossary = parse(GlossaryDocument, 'glossary.json', read('glossary.json'), problems)
  const translations = readdirSync(join(dir, 'translations'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const path = `translations/${name}`
      const file = parse(TranslationFile, path, read(path), problems)
      if (file && `${file.language}.json` !== name)
        problems.push(`${path}: declares language "${file.language}"`)
      return file
    })
    .filter((file) => file !== null)

  // A translation for an id the documents do not have would be laid over
  // nothing: a renamed item whose translations were left behind.
  const itemIds = new Set((items?.items ?? []).map((item) => item.id))
  const termIds = new Set((glossary?.terms ?? []).map((term) => term.id))
  translations.forEach((file) => {
    const strays = [
      ...Object.keys(file.items).filter((id) => !itemIds.has(id)),
      ...Object.keys(file.glossary).filter((id) => !termIds.has(id)),
    ]
    strays.forEach((id) => problems.push(`translations/${file.language}.json: no "${id}"`))
  })

  if (problems.length > 0 || !items || !glossary)
    throw new Error(`content bundle is invalid:\n  ${problems.join('\n  ')}`)

  const sources: [string, string][] = [
    ['items.json', JSON.stringify(items)],
    ['glossary.json', JSON.stringify(glossary)],
    ...translations.map((file): [string, string] => [
      `translations/${file.language}.json`,
      JSON.stringify(file),
    ]),
  ]
  sources.sort(([a], [b]) => (a < b ? -1 : 1))

  const version = createHash('sha256')
    .update(`${CONTENT_SCHEMA_VERSION}\n`)
    .update(sources.map(([path, text]) => `${path}\u0000${text}`).join('\n'))
    .digest('hex')
    .slice(0, 12)

  const manifest = ContentManifest.parse({
    schemaVersion: CONTENT_SCHEMA_VERSION,
    version,
    publishedAt: now.toISOString(),
    ...bundlePaths(
      version,
      translations.map((file) => file.language),
    ),
  })

  const files = Object.fromEntries(sources.map(([path, text]) => [`v${version}/${path}`, text]))
  return { manifest, files }
}
