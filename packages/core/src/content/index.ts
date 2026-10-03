import glossaryDocument from '../../content/glossary.json'
import document from '../../content/items.json'
import { installGlossary } from './glossary'
import { ContentDocument, GlossaryDocument, type Item } from './schema'
import { translationFiles } from './translation-files'
import { applyTranslations, TranslationFile } from './translations'

export { resolveText, setContentLanguage } from './language'

/**
 * The content the app shows. It starts as the bundled document with every
 * shipped translation laid over it, and an app may replace it once, at
 * startup and before anything renders, with a newer copy it downloaded on an
 * earlier open (`installContent`). These are live bindings: an importer reads
 * whatever is installed at the moment it reads, so nothing may copy them into
 * a module-level constant.
 *
 * The bundled document's shape is guaranteed by the build gate, so it is not
 * re-parsed at startup; a downloaded one always is.
 */
export let content: ContentDocument = applyTranslations(
  document as ContentDocument,
  translationFiles,
)

export let items: Item[] = content.items

export function itemById(id: string): Item | undefined {
  return items.find((item) => item.id === id)
}

/** A downloaded bundle, as it arrives: nothing about it is trusted until it parses. */
export interface ContentInput {
  /** `items.json`: the English document. */
  items: unknown
  /** `glossary.json`. */
  glossary: unknown
  /** Translation files to prefer over the shipped ones, one per language. */
  translations: unknown[]
}

export interface ParsedContent {
  items: ContentDocument
  glossary: GlossaryDocument
  translations: TranslationFile[]
}

/** Every part checked against its schema; null when any part fails, so a bundle is all or nothing. */
export function parseContent(input: ContentInput): ParsedContent | null {
  const parsedItems = ContentDocument.safeParse(input.items)
  const glossary = GlossaryDocument.safeParse(input.glossary)
  const translations = input.translations.map((file) => TranslationFile.safeParse(file))
  if (!parsedItems.success || !glossary.success) return null
  if (translations.some((file) => !file.success)) return null
  return {
    items: parsedItems.data,
    glossary: glossary.data,
    translations: translations.flatMap((file) => (file.success ? [file.data] : [])),
  }
}

/**
 * Downloaded translations win for their language; every other language keeps
 * the one the app shipped with, so switching language before the next update
 * still finds text.
 */
function withShipped(downloaded: TranslationFile[]): TranslationFile[] {
  const languages = new Set(downloaded.map((file) => file.language))
  return [...downloaded, ...translationFiles.filter((file) => !languages.has(file.language))]
}

function install(
  document: ContentDocument,
  glossary: GlossaryDocument | null,
  files: TranslationFile[],
): void {
  const translations = withShipped(files)
  content = applyTranslations(document, translations)
  items = content.items
  installGlossary(glossary, translations)
}

/**
 * Replaces the bundled content with a downloaded bundle. Call it before the
 * first screen renders: a screen already showing an item keeps the object it
 * read. Returns false, changing nothing, when any part fails its schema.
 */
export function installContent(input: ContentInput): boolean {
  const parsed = parseContent(input)
  if (!parsed) return false
  install(parsed.items, parsed.glossary, parsed.translations)
  return true
}

let fingerprint: string | null = null

/**
 * Identifies the content this build shipped with: FNV-1a over its files. A
 * download is kept with the fingerprint of the build that fetched it, and
 * dropped once an app update changes what shipped, so bundled content stays
 * the floor and an old download never shadows newer bundled text.
 */
export function shippedContentFingerprint(): string {
  if (fingerprint === null) {
    const text = JSON.stringify([document, glossaryDocument, translationFiles])
    let hash = 0x811c9dc5
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193)
    }
    fingerprint = `${(hash >>> 0).toString(16).padStart(8, '0')}-${text.length}`
  }
  return fingerprint
}

/** Back to the content the app shipped with (tests, and a cache found to be bad). */
export function resetContent(): void {
  install(document as ContentDocument, null, [])
}
