// Runs after `vite build`. Everything a static Apache host needs that a static
// page cannot set itself: per-page CSP, security and cache headers, the sitemap.
//
//   dist/client/.htaccess     Apache (GoDaddy shared hosting)
//   dist/client/_headers      Netlify / Cloudflare Pages
//   dist/client/sitemap.xml
//   dist/headers.json         the same policies, for scripts/serve.ts and the tests
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { DEVELOPMENT_ROBOTS, resolveAppEnv, robotsTxt } from '@ihsaanly/web/app-env'
import { type HeaderMap, inlineBlocks, pageCsp } from '@ihsaanly/web/hosting/csp'
import { buildHeadersFile, buildHtaccess } from '@ihsaanly/web/hosting/htaccess'
import { absolute, LOCALES, PAGES, pageUrl } from '../src/i18n/locales.ts'

const ROOT = join(import.meta.dir, '..')
const CLIENT = join(ROOT, 'dist', 'client')
const MESSAGES = join(ROOT, 'src', 'i18n', 'messages')
const ENGLISH = LOCALES[0]

// A development build (dev.ihsaanly.app) is kept out of every index: the
// pages carry a robots meta (src/routes/__root.tsx), every response an
// X-Robots-Tag, and robots.txt disallows everything. The sitemap is still
// written; robots.txt no longer points at it. Production output is untouched.
const APP_ENV = resolveAppEnv(process.env.VITE_APP_ENV)

const problems: string[] = []

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory())
      return name === 'assets' || name === '__tsr' ? [] : htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })
}

/** dist/client/ar/index.html → /ar/, dist/client/404.html → /404.html */
function urlPath(file: string): string {
  const rel = relative(CLIENT, file).split(sep).join('/')
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`
}

function policies(): HeaderMap {
  const pages: Record<string, string> = {}
  for (const file of htmlFiles(CLIENT)) {
    const html = readFileSync(file, 'utf8')
    const path = urlPath(file)
    if (/<[a-z][^>]*\sstyle="/i.test(html))
      problems.push(`${path}: a style attribute the CSP blocks`)
    pages[path] = pageCsp(inlineBlocks(html))
  }
  const fallback = pages['/404.html']
  if (!fallback) throw new Error('dist/client/404.html is missing')
  return APP_ENV === 'development'
    ? { pages, fallback, headers: { 'X-Robots-Tag': DEVELOPMENT_ROBOTS } }
    : { pages, fallback }
}

function sitemap(): string {
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

function flatten(
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

function report(): string[] {
  const read = (code: string): Map<string, string> | null => {
    const file = join(MESSAGES, `${code}.json`)
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
function staticNotFound(): void {
  const file = join(CLIENT, '404.html')
  const html = readFileSync(file, 'utf8')
    .replace(/<link rel="modulepreload"[^>]*>/g, '')
    .replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (whole, attributes = '', body = '') =>
      /application\/(?:ld\+)?json/.test(attributes) || body.includes('ihsaanly.theme') ? whole : '',
    )
  writeFileSync(file, html)
}

// ---- Main ----

// The 404 route also prerenders as /404/; only /404.html is served.
rmSync(join(CLIENT, '404'), { recursive: true, force: true })
staticNotFound()

const map = policies()
writeFileSync(
  join(CLIENT, '.htaccess'),
  buildHtaccess({ headerMap: map, notFoundPath: '/404.html' }),
)
writeFileSync(join(CLIENT, '_headers'), buildHeadersFile(map))
writeFileSync(join(CLIENT, 'sitemap.xml'), sitemap())
// Production keeps public/robots.txt as it is (it names the sitemap).
if (APP_ENV === 'development') writeFileSync(join(CLIENT, 'robots.txt'), robotsTxt(APP_ENV))
writeFileSync(join(ROOT, 'dist', 'headers.json'), `${JSON.stringify(map, null, 2)}\n`)

console.log(`postbuild: ${Object.keys(map.pages).length} pages, each with its own CSP (${APP_ENV})`)
console.log('translations:')
for (const line of report()) console.log(line)
if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
