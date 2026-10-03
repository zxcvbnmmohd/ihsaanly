import { z } from 'zod'

/**
 * The contract between the content publisher (the marketing build, which
 * writes `/content/` on ihsaanly.app and dev.ihsaanly.app) and every client
 * that fetches it. Pure and dependency-free beyond zod, so the apps import it;
 * the build-only writer is `bundle-build.ts`.
 *
 *   <base>/manifest.json                     ContentManifest, never cached
 *   <base>/v<version>/items.json             ContentDocument (English, untranslated)
 *   <base>/v<version>/glossary.json          GlossaryDocument
 *   <base>/v<version>/translations/<l>.json  TranslationFile
 *
 * Every path in the manifest is relative to `<base>/` (the URL ending
 * `/content`). A client that does not understand `schemaVersion` ignores the
 * bundle and keeps the content it shipped with.
 *
 * 2: items gained `isPrayer`, `onlyWhilePaused` and the `night` window. An
 * app built for 1 would drop the flags and show the pause's items to everyone,
 * so it must not install a 2 bundle.
 */
export const CONTENT_SCHEMA_VERSION = 2

/** Where production publishes it; a build's VITE_CONTENT_URL overrides it (dev: https://dev.ihsaanly.app/content). */
export const DEFAULT_CONTENT_URL = 'https://ihsaanly.app/content'

/** The manifest's own path, relative to the content base URL. */
export const CONTENT_MANIFEST_PATH = 'manifest.json'

const Version = z.string().regex(/^[0-9a-f]{12}$/)

// Strict on purpose: a manifest can only point at files inside its own
// version folder, never at `..` or another origin.
const BundlePath = z
  .string()
  .regex(/^v[0-9a-f]{12}\/(?:items|glossary|translations\/[a-z]{2,3})\.json$/)

export const ContentManifest = z
  .object({
    schemaVersion: z.number().int().positive(),
    version: Version,
    publishedAt: z.iso.datetime(),
    items: BundlePath,
    glossary: BundlePath,
    translations: z.record(z.string().regex(/^[a-z]{2,3}$/), BundlePath),
  })
  .superRefine((manifest, ctx) => {
    const folder = `v${manifest.version}/`
    const paths: [string, string][] = [
      ['items', manifest.items],
      ['glossary', manifest.glossary],
      ...Object.entries(manifest.translations).map(([language, path]): [string, string] => [
        `translations.${language}`,
        path,
      ]),
    ]
    paths
      .filter(([, path]) => !path.startsWith(folder))
      .forEach(([name, path]) =>
        ctx.addIssue({
          code: 'custom',
          path: name.split('.'),
          message: `"${path}" is outside ${folder}`,
        }),
      )
  })

export type ContentManifest = z.infer<typeof ContentManifest>

/** What the publisher writes: the manifest, and every file it names keyed by its relative path. */
export interface ContentBundle {
  manifest: ContentManifest
  files: Record<string, string>
}

/** The relative paths of one version's files, as the manifest names them. */
export function bundlePaths(
  version: string,
  languages: string[],
): Pick<ContentManifest, 'items' | 'glossary' | 'translations'> {
  return {
    items: `v${version}/items.json`,
    glossary: `v${version}/glossary.json`,
    translations: Object.fromEntries(
      languages.map((language) => [language, `v${version}/translations/${language}.json`]),
    ),
  }
}

/** `base` is the content base URL (ending `/content`, with or without a trailing slash). */
export function contentUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path}`
}
