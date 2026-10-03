import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CONTENT_SCHEMA_VERSION, ContentManifest } from './bundle'
import { buildContentBundle, CONTENT_DIR } from './bundle-build'
import { ContentDocument, GlossaryDocument } from './schema'
import { TranslationFile } from './translations'

const NOW = new Date('2026-10-03T12:00:00.000Z')
const LANGUAGES = readdirSync(join(CONTENT_DIR, 'translations'))
  .map((name) => name.replace(/\.json$/, ''))
  .sort()

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'content-bundle-'))
  cpSync(CONTENT_DIR, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function edit(path: string, change: (json: Record<string, unknown>) => void): void {
  const file = join(dir, path)
  const json = JSON.parse(readFileSync(file, 'utf8'))
  change(json)
  writeFileSync(file, JSON.stringify(json))
}

describe('buildContentBundle', () => {
  it('publishes items, glossary and every translation under one version folder', () => {
    const { manifest, files } = buildContentBundle({ now: NOW })
    expect(ContentManifest.parse(manifest)).toEqual(manifest)
    expect(manifest.schemaVersion).toBe(CONTENT_SCHEMA_VERSION)
    expect(manifest.publishedAt).toBe('2026-10-03T12:00:00.000Z')
    expect(manifest.version).toMatch(/^[0-9a-f]{12}$/)
    expect(Object.keys(manifest.translations).sort()).toEqual(LANGUAGES)
    const named = [manifest.items, manifest.glossary, ...Object.values(manifest.translations)]
    expect(Object.keys(files).sort()).toEqual(named.sort())
    expect(named.every((path) => path.startsWith(`v${manifest.version}/`))).toBe(true)
  })

  it('writes files that pass the same schemas the client checks', () => {
    const { manifest, files } = buildContentBundle({ now: NOW })
    const read = (path: string): unknown => JSON.parse(files[path] ?? 'null')
    expect(ContentDocument.safeParse(read(manifest.items)).success).toBe(true)
    expect(GlossaryDocument.safeParse(read(manifest.glossary)).success).toBe(true)
    for (const [language, path] of Object.entries(manifest.translations)) {
      expect(TranslationFile.parse(read(path)).language).toBe(language)
    }
  })

  it('gives the same content the same version, whenever it is built', () => {
    const first = buildContentBundle({ now: NOW })
    const second = buildContentBundle({ dir, now: new Date('2030-01-01T00:00:00.000Z') })
    expect(second.manifest.version).toBe(first.manifest.version)
    expect(second.files).toEqual(first.files)
  })

  it('gives changed content a new version', () => {
    const before = buildContentBundle({ dir, now: NOW }).manifest.version
    edit('glossary.json', (json) => {
      const [first] = json.terms as { definition: Record<string, string> }[]
      if (first) first.definition.en = `${first.definition.en} (revised)`
    })
    expect(buildContentBundle({ dir, now: NOW }).manifest.version).not.toBe(before)
  })

  it('defaults to the time of the build', () => {
    const before = Date.now()
    const { manifest } = buildContentBundle()
    expect(Date.parse(manifest.publishedAt)).toBeGreaterThanOrEqual(before - 1)
  })

  it('refuses invalid items, glossary and translations, listing each problem', () => {
    edit('items.json', (json) => {
      json.schemaVersion = 2
    })
    edit('glossary.json', (json) => {
      json.terms = [{ id: 'Not A Slug' }]
    })
    edit('translations/fr.json', (json) => {
      json.unknown = true
    })
    expect(() => buildContentBundle({ dir })).toThrow(
      /items\.json: schemaVersion[\s\S]*glossary\.json: terms\.0\.id[\s\S]*translations\/fr\.json: \(root\)/,
    )
  })

  it('refuses a translation file named for another language', () => {
    edit('translations/fr.json', (json) => {
      json.language = 'de'
    })
    expect(() => buildContentBundle({ dir })).toThrow(
      'translations/fr.json: declares language "de"',
    )
  })

  it('refuses translations of items or terms that do not exist', () => {
    edit('translations/fr.json', (json) => {
      json.items = { 'no-such-item': { title: 'x' } }
      json.glossary = { 'no-such-term': { term: 'x' } }
    })
    const build = (): unknown => buildContentBundle({ dir })
    expect(build).toThrow('translations/fr.json: no "no-such-item"')
    expect(build).toThrow('translations/fr.json: no "no-such-term"')
  })

  it('ignores files in translations/ that are not JSON', () => {
    writeFileSync(join(dir, 'translations', 'README.md'), '# notes')
    expect(Object.keys(buildContentBundle({ dir }).manifest.translations).sort()).toEqual(LANGUAGES)
  })
})
