// Runs after `vite build`. Everything a static Apache host needs that a static
// page cannot set itself: per-page CSP, security and cache headers, the sitemap.
//
//   dist/client/.htaccess     Apache (GoDaddy shared hosting)
//   dist/client/_headers      Netlify / Cloudflare Pages
//   dist/client/sitemap.xml
//   dist/client/content/      the app content, for remote updates (see HOSTING.md)
//   dist/headers.json         the same policies, for scripts/serve.ts and the tests
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { CONTENT_MANIFEST_PATH, type ContentBundle } from '@ihsaanly/core/content/bundle'
import { buildContentBundle } from '@ihsaanly/core/content/bundle-build'
import { type AppEnv, DEVELOPMENT_ROBOTS, resolveAppEnv, robotsTxt } from '@ihsaanly/web/app-env'
import { type HeaderMap, inlineBlocks, pageCsp } from '@ihsaanly/web/hosting/csp'
import { buildHeadersFile, buildHtaccess } from '@ihsaanly/web/hosting/htaccess'
import { absolute, LOCALES, PAGES, pageUrl } from '../src/i18n/locales.ts'

const ENGLISH = LOCALES[0]

export function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory())
      return name === 'assets' || name === '__tsr' ? [] : htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })
}

/** dist/client/ar/index.html → /ar/, dist/client/404.html → /404.html */
export function urlPath(client: string, file: string): string {
  const rel = relative(client, file).split(sep).join('/')
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`
}

/** Every page's own CSP, from the inline scripts and styles it carries. */
export function policies(client: string, env: AppEnv, problems: string[]): HeaderMap {
  const pages: Record<string, string> = {}
  for (const file of htmlFiles(client)) {
    const html = readFileSync(file, 'utf8')
    const path = urlPath(client, file)
    if (/<[a-z][^>]*\sstyle="/i.test(html))
      problems.push(`${path}: a style attribute the CSP blocks`)
    pages[path] = pageCsp(inlineBlocks(html))
  }
  const fallback = pages['/404.html']
  if (!fallback) throw new Error('dist/client/404.html is missing')
  return env === 'development'
    ? { pages, fallback, headers: { 'X-Robots-Tag': DEVELOPMENT_ROBOTS } }
    : { pages, fallback }
}

export function sitemap(): string {
  const urls = Object.values(PAGES).flatMap((page) =>
    LOCALES.map((locale) => {
      const links = [
        ...LOCALES.map(
          (each) =>
            `    <xhtml:link rel="alternate" hreflang="${each.hreflang}" href="${absolute(pageUrl(each, page.path))}" />`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(pageUrl(ENGLISH ?? locale, page.path))}" />`,
      ]
      return `  <url>\n    <loc>${absolute(pageUrl(locale, page.path))}</loc>\n${links.join('\n')}\n  </url>`
    }),
  )
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`
}

// ---- Translation report, as the old generator printed it ----

export function flatten(
  value: unknown,
  prefix = '',
  into = new Map<string, string>(),
): Map<string, string> {
  if (typeof value !== 'object' || value === null) return into
  for (const [key, child] of Object.entries(value)) {
    if (key === '_comment' || key.endsWith('_comment')) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') into.set(path, child)
    else flatten(child, path, into)
  }
  return into
}

export function report(messages: string): string[] {
  const read = (code: string): Map<string, string> | null => {
    const file = join(messages, `${code}.json`)
    return existsSync(file) ? flatten(JSON.parse(readFileSync(file, 'utf8'))) : null
  }
  const english = read('en') ?? new Map()
  return LOCALES.map(({ code }) => {
    const own = read(code)
    if (!own) return `  ${code.padEnd(4)} no file, English throughout`
    const missing = [...english.keys()].filter((key) => !own.get(key)?.trim())
    return `  ${code.padEnd(4)} ${missing.length ? `${missing.length} missing (${missing.slice(0, 6).join(', ')})` : 'complete'}`
  })
}

// ---- The 404 page ships without the app ----

// The host serves 404.html at whatever unknown URL was asked for, and React
// would hydrate it against a route that cannot match, so the page is left
// static: links are plain anchors and the language menu is a <details>. Only
// the pre-paint theme script stays.
export function staticNotFound(client: string): void {
  const file = join(client, '404.html')
  const html = readFileSync(file, 'utf8')
    .replace(/<link rel="modulepreload"[^>]*>/g, '')
    .replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (whole, attributes = '', body = '') =>
      /application\/(?:ld\+)?json/.test(attributes) || body.includes('ihsaanly.theme') ? whole : '',
    )
  writeFileSync(file, html)
}

// ---- Content updates ----

// packages/core/content, published at /content/ so the apps can pick up new
// content without a release. Every client fetches it cross-origin (the
// companion, the extension, the mobile app), and it is public, hence `*`.
// The manifest is revalidated on every request; a version folder is named by
// its content hash, so it never changes once written.
const JSON_TYPE = 'application/json; charset=utf-8'
export const CONTENT_HEADERS: Record<string, Record<string, string>> = {
  '/content/manifest.json': {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': JSON_TYPE,
    'Cache-Control': 'no-cache',
  },
  '/content/:version/*': {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': JSON_TYPE,
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
}

/**
 * Writes the bundle to `<client>/content/`: manifest.json and the one
 * v<version>/ folder it names. Only the current version is published; the
 * FTP deploy removes the old folder. While an upload is in flight a client can
 * see a manifest whose files are not there yet (or are already gone), and it
 * then keeps the content it has and tries again later.
 */
export function publishContent(client: string, bundle: ContentBundle = buildContentBundle()): void {
  const dir = join(client, 'content')
  rmSync(dir, { recursive: true, force: true })
  for (const [path, text] of Object.entries(bundle.files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  writeFileSync(join(dir, CONTENT_MANIFEST_PATH), `${JSON.stringify(bundle.manifest, null, 2)}\n`)
  console.log(
    `content: v${bundle.manifest.version}, ${Object.keys(bundle.files).length} files at /content/`,
  )
}

// ---- Main ----

/**
 * Writes everything the host needs next to the built pages in `<root>/dist`,
 * logs what it did, and returns the problems it found (none when the build is
 * good).
 */
export function postbuild(root: string, env: AppEnv): string[] {
  const client = join(root, 'dist', 'client')
  const problems: string[] = []

  // The 404 route also prerenders as /404/; only /404.html is served.
  rmSync(join(client, '404'), { recursive: true, force: true })
  staticNotFound(client)

  publishContent(client)
  const map: HeaderMap = { ...policies(client, env, problems), paths: CONTENT_HEADERS }
  writeFileSync(
    join(client, '.htaccess'),
    buildHtaccess({ headerMap: map, notFoundPath: '/404.html' }),
  )
  writeFileSync(join(client, '_headers'), buildHeadersFile(map))
  writeFileSync(join(client, 'sitemap.xml'), sitemap())
  // Production keeps public/robots.txt as it is (it names the sitemap).
  if (env === 'development') writeFileSync(join(client, 'robots.txt'), robotsTxt(env))
  writeFileSync(join(root, 'dist', 'headers.json'), `${JSON.stringify(map, null, 2)}\n`)

  console.log(`postbuild: ${Object.keys(map.pages).length} pages, each with its own CSP (${env})`)
  console.log('translations:')
  for (const line of report(join(root, 'src', 'i18n', 'messages'))) console.log(line)
  for (const problem of problems) console.error(`  ${problem}`)
  return problems
}

// A development build (dev.ihsaanly.app) is kept out of every index: the
// pages carry a robots meta (src/routes/__root.tsx), every response an
// X-Robots-Tag, and robots.txt disallows everything. The sitemap is still
// written; robots.txt no longer points at it. Production output is untouched.
/** The command line's entry: this app's postbuild, as an exit code. */
export function cli(
  root = join(import.meta.dir, '..'),
  env = resolveAppEnv(process.env.VITE_APP_ENV),
): number {
  return postbuild(root, env).length ? 1 : 0
}

if (import.meta.main) process.exitCode = cli()
