// Builds the static website into site/dist/, one copy per language.
//
//   bun scripts/build-site.ts        (or `bun run build:site`)
//
// Templates live in site/src/, English copy in site/i18n/en.json and every
// other language in site/i18n/<code>.json. A key a language leaves out falls
// back to English and is listed in the report at the end. English is served at
// the root and every other language under /<code>/. Zero dependencies: Bun only.
//
// Template syntax:
//   {{> name}}   a partial from site/src/partials/name.html
//   {{t key}}    a string, with the inline HTML it may carry (a, strong, em, br)
//   {{a key}}    a string for an attribute: no markup, fully escaped
//   {{v name}}   a value the build computes (URLs, head tags, data)

import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const SITE = join(ROOT, 'site')
const SRC = join(SITE, 'src')
const I18N = join(SITE, 'i18n')
const ASSETS = join(SITE, 'assets')
const DIST = join(SITE, 'dist')
const BASE_URL = 'https://ihsaanly.app'
const DONATE_URL = 'https://donate.ihsaanly.app'
const EMAIL = 'support@ihsaanly.app'
const THEME_KEY = 'ihsaanly.theme'

interface Locale {
  /** The app's own language code, used in URLs and the i18n file name. */
  code: string
  /** BCP 47 tag for the `lang` attribute. */
  lang: string
  /** Tag for `hreflang`, which only accepts ISO 639-1 languages. */
  hreflang: string
  dir: 'ltr' | 'rtl'
  /** The language's name in itself, as the app's Language screen shows it. */
  name: string
  /** Open Graph locale, language_TERRITORY. */
  og: string
}

// `yue` (Cantonese) has no ISO 639-1 code, and hreflang rejects ISO 639-3, so
// it is announced as Traditional Chinese for Hong Kong, the audience the app
// reads as Cantonese (`normalise` in src/i18n/locale.ts). `lang` stays honest.
const LOCALES: Locale[] = [
  { code: 'en', lang: 'en', hreflang: 'en', dir: 'ltr', name: 'English', og: 'en_US' },
  { code: 'ar', lang: 'ar', hreflang: 'ar', dir: 'rtl', name: 'العربية', og: 'ar_AR' },
  { code: 'fr', lang: 'fr', hreflang: 'fr', dir: 'ltr', name: 'Français', og: 'fr_FR' },
  { code: 'it', lang: 'it', hreflang: 'it', dir: 'ltr', name: 'Italiano', og: 'it_IT' },
  { code: 'ja', lang: 'ja', hreflang: 'ja', dir: 'ltr', name: '日本語', og: 'ja_JP' },
  { code: 'hi', lang: 'hi', hreflang: 'hi', dir: 'ltr', name: 'हिन्दी', og: 'hi_IN' },
  { code: 'ur', lang: 'ur', hreflang: 'ur', dir: 'rtl', name: 'اردو', og: 'ur_PK' },
  { code: 'so', lang: 'so', hreflang: 'so', dir: 'ltr', name: 'Soomaali', og: 'so_SO' },
  {
    code: 'zh',
    lang: 'zh-Hans',
    hreflang: 'zh-Hans',
    dir: 'ltr',
    name: '中文（普通话）',
    og: 'zh_CN',
  },
  {
    code: 'yue',
    lang: 'yue-Hant',
    hreflang: 'zh-Hant-HK',
    dir: 'ltr',
    name: '廣東話',
    og: 'zh_HK',
  },
]

const ENGLISH: Locale = LOCALES[0] ?? fail('The locale table is empty')

type PageId = 'home' | 'privacy' | 'terms'

interface Page {
  id: PageId
  template: string
  /** Path under the locale's root, '' for the home page. */
  path: string
  titleKey: string
  descriptionKey: string
  /** Legal pages carry a date, formatted per language. */
  updated?: Date
}

const PAGES: Page[] = [
  {
    id: 'home',
    template: 'index.html',
    path: '',
    titleKey: 'home.title',
    descriptionKey: 'home.description',
  },
  {
    id: 'privacy',
    template: 'legal/privacy/index.html',
    path: 'legal/privacy/',
    titleKey: 'privacy.pageTitle',
    descriptionKey: 'privacy.description',
    updated: new Date(Date.UTC(2026, 8, 25)),
  },
  {
    id: 'terms',
    template: 'legal/terms/index.html',
    path: 'legal/terms/',
    titleKey: 'terms.pageTitle',
    descriptionKey: 'terms.description',
    updated: new Date(Date.UTC(2026, 8, 25)),
  },
]

/** Assets whose names get a content hash, so a host may cache them forever. */
const HASHED = [
  'Amiri-Regular.woff2',
  'Amiri-Regular.ttf',
  'site.css',
  'demo.css',
  'site.js',
  'demo.js',
]

function fail(message: string): never {
  throw new Error(message)
}

// ---- Strings ----

type Strings = Map<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNote(key: string): boolean {
  return key === '_comment' || key.endsWith('_comment')
}

function flatten(value: unknown, prefix: string, into: Strings, file: string): Strings {
  if (!isRecord(value)) fail(`${file}: expected an object at "${prefix || '(root)'}"`)
  for (const [key, child] of Object.entries(value)) {
    if (isNote(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') into.set(path, child)
    else flatten(child, path, into, file)
  }
  return into
}

function readStrings(code: string): Strings | null {
  const file = join(I18N, `${code}.json`)
  if (!existsSync(file)) return null
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  return flatten(parsed, '', new Map(), `i18n/${code}.json`)
}

interface Catalogue {
  strings: Strings
  missing: string[]
  unknown: string[]
  present: boolean
}

function catalogue(locale: Locale, english: Strings): Catalogue {
  const own = locale.code === 'en' ? english : readStrings(locale.code)
  const strings: Strings = new Map()
  const missing: string[] = []
  for (const [key, value] of english) {
    const translated = own?.get(key)
    if (translated === undefined || translated.trim() === '') {
      if (locale.code !== 'en') missing.push(key)
      strings.set(key, value)
    } else {
      strings.set(key, translated)
    }
  }
  const unknown = own ? [...own.keys()].filter((key) => !english.has(key)) : []
  return { strings, missing, unknown, present: own !== null }
}

// ---- Escaping and the inline-HTML allow-list ----

function escapeText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttr(text: string): string {
  return escapeText(text).replaceAll('"', '&quot;')
}

const TAG = /<(\/?)([a-zA-Z]+)([^>]*)>/g
const ALLOWED = new Set(['a', 'strong', 'em', 'br'])
const SAFE_HREF = /^(https:\/\/|mailto:|\/|#)/

const problems: string[] = []

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) => values[name] ?? whole)
}

/** A string as HTML: only the allowed tags survive, everything else is text. */
function rich(text: string, where: string): string {
  let out = ''
  let last = 0
  for (const match of text.matchAll(TAG)) {
    const [whole, closing, rawName, rest] = match
    const name = (rawName ?? '').toLowerCase()
    const index = match.index
    out += escapeText(text.slice(last, index))
    last = index + whole.length
    if (!ALLOWED.has(name)) {
      problems.push(`${where}: <${name}> is not allowed, shown as text`)
      out += escapeText(whole)
    } else if (name === 'br') {
      out += '<br />'
    } else if (closing) {
      out += `</${name}>`
    } else if (name === 'a') {
      const href = /href="([^"]*)"/.exec(rest ?? '')?.[1] ?? ''
      if (!SAFE_HREF.test(href)) problems.push(`${where}: link "${href}" is not an allowed address`)
      out += `<a href="${escapeAttr(SAFE_HREF.test(href) ? href : '#')}">`
    } else {
      out += `<${name}>`
    }
  }
  return out + escapeText(text.slice(last))
}

/** A string for an attribute or a <title>: tags are dropped. */
function plain(text: string): string {
  return escapeAttr(text.replace(TAG, ''))
}

// ---- URLs ----

function localePrefix(locale: Locale): string {
  return locale.code === 'en' ? '/' : `/${locale.code}/`
}

function pageUrl(locale: Locale, path: string): string {
  return `${localePrefix(locale)}${path}`
}

function absolute(path: string): string {
  return `${BASE_URL}${path}`
}

// ---- Assets ----

function hashedName(name: string, contents: Uint8Array): string {
  const hash = createHash('sha256').update(contents).digest('hex').slice(0, 10)
  const dot = name.lastIndexOf('.')
  return `${name.slice(0, dot)}.${hash}${name.slice(dot)}`
}

// Comments and whitespace only. Bun's CSS minifier would also "lower" logical
// properties into :lang() selectors, which guesses direction from language
// and breaks the dir="ltr" romanised line inside an Arabic page.
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
}

// Equivalent to `bun build site/demo/main.ts --target=browser --format=iife
// --minify`. No source map: nothing is debugged from the live site, and a
// published map would double what visitors could be sent.
async function buildDemo(outdir: string): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(SITE, 'demo/main.ts')],
    outdir,
    target: 'browser',
    format: 'iife',
    minify: true,
    sourcemap: 'none',
    naming: 'demo.[ext]',
  })
  if (!result.success) fail(`The demo bundle failed to build: ${result.logs.join('\n')}`)
}

async function minifyJs(file: string): Promise<Uint8Array> {
  const result = await Bun.build({ entrypoints: [file], minify: true, target: 'browser' })
  const output = result.outputs[0]
  if (!result.success || !output) fail(`Could not minify ${file}: ${result.logs.join('\n')}`)
  return new Uint8Array(await output.arrayBuffer())
}

async function copyAssets(): Promise<Map<string, string>> {
  const out = join(DIST, 'assets')
  mkdirSync(out, { recursive: true })
  for (const entry of readdirSync(ASSETS)) {
    if (HASHED.includes(entry)) continue
    cpSync(join(ASSETS, entry), join(out, entry), { recursive: true })
  }

  const staging = join(DIST, '.staging')
  mkdirSync(staging, { recursive: true })
  await buildDemo(staging)

  // In order: fonts before the stylesheet that names them.
  const names = new Map<string, string>()
  for (const name of HASHED) {
    const source = name === 'demo.js' ? join(staging, name) : join(ASSETS, name)
    let contents: Uint8Array
    if (name.endsWith('.css')) {
      let css = readFileSync(source, 'utf8')
      for (const [font, url] of names) css = css.replaceAll(`url('${font}')`, `url('${url}')`)
      contents = new TextEncoder().encode(minifyCss(css))
    } else if (name === 'site.js') {
      contents = await minifyJs(source)
    } else {
      contents = new Uint8Array(readFileSync(source))
    }
    const hashed = hashedName(name, contents)
    writeFileSync(join(out, hashed), contents)
    names.set(name, `/assets/${hashed}`)
  }
  rmSync(staging, { recursive: true, force: true })
  return names
}

// ---- The theme script, inlined in every <head> ----

// Runs before first paint so a stored choice never flashes the other theme.
// `?theme=light|dark|system` overrides the stored choice for this view only,
// which is what screenshots and QA use; it is never saved.
const THEME_SCRIPT =
  "(function(){var d=document.documentElement,t=null;try{var q=/[?&]theme=(light|dark|system)(&|$)/.exec(location.search);t=q?q[1]:localStorage.getItem('" +
  THEME_KEY +
  "')}catch(e){}if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);var m=document.querySelectorAll('meta[name=\"theme-color\"]');for(var i=0;i<m.length;i++)m[i].setAttribute('content',t==='dark'?'#1b1411':'#f7f0e9')}})()"

function cspHash(script: string): string {
  return `'sha256-${createHash('sha256').update(script).digest('base64')}'`
}

// ---- Content: the dua specimen reads the app's own items and translations ----

interface LocalText {
  [language: string]: string | undefined
}

interface ContentItem {
  id: string
  title: LocalText
  arabic: string
  transliteration: LocalText
  translation: LocalText
}

interface TranslatedItem {
  title?: string
  translation?: string
}

function isContentItem(value: unknown): value is ContentItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.arabic === 'string' &&
    isRecord(value.title) &&
    isRecord(value.transliteration) &&
    isRecord(value.translation)
  )
}

function readContent(): ContentItem[] {
  const parsed: unknown = JSON.parse(readFileSync(join(ROOT, 'content/items.json'), 'utf8'))
  const items = isRecord(parsed) && Array.isArray(parsed.items) ? parsed.items : []
  return items.filter(isContentItem)
}

function readTranslatedItems(code: string): Map<string, TranslatedItem> {
  const file = join(ROOT, 'content/translations', `${code}.json`)
  const found = new Map<string, TranslatedItem>()
  if (!existsSync(file)) return found
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  const items = isRecord(parsed) && isRecord(parsed.items) ? parsed.items : {}
  for (const [id, item] of Object.entries(items)) {
    if (!isRecord(item)) continue
    found.set(id, {
      title: typeof item.title === 'string' ? item.title : undefined,
      translation: typeof item.translation === 'string' ? item.translation : undefined,
    })
  }
  return found
}

interface SpecimenDua {
  title: string
  titleLang: string | null
  arabic: string
  transliteration: string
  /** Null when the page language has none, as for Arabic: the app omits it too. */
  translation: string | null
  source: string
  grading: string
}

const SPECIMEN = [
  { id: 'dua-leaving-home', key: 'leaving', grading: true },
  { id: 'dua-riding', key: 'riding', grading: true },
  { id: 'dua-entering-home', key: 'entering', grading: false },
]

function specimenDuas(locale: Locale, strings: Strings, content: ContentItem[]): SpecimenDua[] {
  const translated = readTranslatedItems(locale.code)
  return SPECIMEN.map(({ id, key, grading }) => {
    const item = content.find((candidate) => candidate.id === id) ?? fail(`No item ${id}`)
    const own = translated.get(id)
    const title = own?.title ?? item.title[locale.code] ?? null
    const translation = own?.translation ?? item.translation[locale.code] ?? null
    const english = locale.code === 'en' ? null : 'en'
    // The meaning is content, so it follows the app's resolveText: a language
    // without one gets none rather than English (Arabic has none by design).
    return {
      title: title ?? get(strings, `home.specimen.${key}Title`),
      titleLang: title === null ? english : null,
      arabic: item.arabic,
      transliteration: item.transliteration.en ?? '',
      translation,
      source: get(strings, `home.specimen.${key}Source`),
      grading: grading ? get(strings, `home.specimen.${key}Grading`) : '',
    }
  })
}

function langAttr(lang: string | null): string {
  return lang ? ` lang="${lang}"` : ''
}

function specimenHtml(duas: SpecimenDua[], strings: Strings): string {
  const first = duas[0] ?? fail('The specimen has no duas')
  // `<` is escaped so no string can close the data block early.
  const data = JSON.stringify(duas).replaceAll('<', '\\u003c')
  const source = `<strong>${escapeText(first.source)}</strong>${first.grading ? ` ${escapeText(first.grading)}` : ''}`
  return `          <figure class="specimen" aria-labelledby="specimen-title">
            <div class="specimen-head">
              <h3 id="specimen-title"${langAttr(first.titleLang)}>${escapeText(first.title)}</h3>
              <button type="button" data-next hidden>${rich(get(strings, 'home.specimen.next'), 'home.specimen.next')}</button>
            </div>
            <p class="arabic" lang="ar" dir="rtl" data-field="arabic">${escapeText(first.arabic)}</p>
            <p class="transliteration" lang="ar-Latn" dir="ltr" data-field="transliteration">${escapeText(first.transliteration)}</p>
            <p class="translation" data-field="translation"${first.translation === null ? ' hidden' : ''}>${escapeText(first.translation ?? '')}</p>
            <p class="source" data-field="source">${source}</p>
            <div class="practice" data-practice hidden>
              <button type="button" aria-pressed="false" data-hide="transliteration">${rich(get(strings, 'home.specimen.hideTransliteration'), 'specimen')}</button>
${
  duas.some((dua) => dua.translation !== null)
    ? `              <button type="button" aria-pressed="false" data-hide="translation">${rich(get(strings, 'home.specimen.hideTranslation'), 'specimen')}</button>\n`
    : ''
}            </div>
          </figure>
          <script type="application/json" id="specimen-data">${data}</script>`
}

// ---- Head tags ----

function alternates(page: Page): string {
  const links = LOCALES.map(
    (locale) =>
      `    <link rel="alternate" hreflang="${locale.hreflang}" href="${absolute(pageUrl(locale, page.path))}" />`,
  )
  links.push(
    `    <link rel="alternate" hreflang="x-default" href="${absolute(pageUrl(ENGLISH, page.path))}" />`,
  )
  return links.join('\n')
}

function seo(
  page: Page,
  locale: Locale,
  strings: Strings,
  title: string,
  description: string,
): string {
  const url = absolute(pageUrl(locale, page.path))
  const shareDescription =
    page.id === 'home' ? plain(get(strings, 'home.shareDescription')) : description
  const others = LOCALES.filter((other) => other !== locale)
    .map((other) => `    <meta property="og:locale:alternate" content="${other.og}" />`)
    .join('\n')
  return [
    `    <link rel="canonical" href="${url}" />`,
    alternates(page),
    `    <meta property="og:site_name" content="Ihsaanly" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${shareDescription}" />`,
    `    <meta property="og:url" content="${url}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:locale" content="${locale.og}" />`,
    others,
    `    <meta property="og:image" content="${absolute('/assets/og.png')}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:image:alt" content="${plain(get(strings, 'home.shareImageAlt'))}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n')
}

function jsonLd(locale: Locale, strings: Strings): string {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Mohd Inc.',
        url: `${BASE_URL}/`,
        email: EMAIL,
        logo: absolute('/assets/apple-touch-icon.png'),
      },
      {
        '@type': 'MobileApplication',
        '@id': `${BASE_URL}/#app`,
        name: 'Ihsaanly',
        url: absolute(pageUrl(locale, '')),
        description: get(strings, 'home.description').replace(TAG, ''),
        operatingSystem: 'iOS, Android',
        applicationCategory: 'LifestyleApplication',
        inLanguage: LOCALES.map((each) => each.lang),
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${BASE_URL}/#organization` },
      },
    ],
  }
  const json = JSON.stringify(graph).replaceAll('<', '\\u003c')
  return `    <script type="application/ld+json">${json}</script>`
}

// ---- Header controls ----

function languageMenu(
  page: Page,
  locale: Locale,
  strings: Strings,
  catalogues: Map<string, Catalogue>,
): string {
  const items = LOCALES.map((each) => {
    const current = each === locale ? ' aria-current="page"' : ''
    return `              <li><a href="${pageUrl(each, page.path)}" lang="${each.lang}" hreflang="${each.hreflang}" data-locale="${each.code}"${current}><span dir="${each.dir}">${escapeText(each.name)}</span></a></li>`
  }).join('\n')

  // English pages carry each language's own "available in" line, so the
  // suggestion can speak to the visitor in the language it suggests.
  let suggest = ''
  if (locale.code === 'en') {
    const offers: Record<string, Record<string, string>> = {}
    for (const each of LOCALES) {
      if (each.code === 'en') continue
      const own = catalogues.get(each.code)?.strings ?? strings
      offers[each.code] = {
        code: each.code,
        name: each.name,
        href: pageUrl(each, page.path),
        lang: each.lang,
        dir: each.dir,
        text: get(own, 'common.suggest.text').replace(TAG, ''),
        dismiss: get(own, 'common.suggest.dismiss').replace(TAG, ''),
      }
    }
    suggest = `\n          <script type="application/json" id="locale-offers">${JSON.stringify(offers).replaceAll('<', '\\u003c')}</script>`
  }

  return `          <details class="tool lang-menu">
            <summary>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
                <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5" />
                <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z" fill="none" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <span class="visually-hidden">${escapeText(get(strings, 'common.language.label'))}:</span>
              <span class="lang-current">${escapeText(locale.name)}</span>
            </summary>
            <ul class="lang-list">
${items}
            </ul>
          </details>${suggest}`
}

// ---- Rendering ----

function get(strings: Strings, key: string): string {
  return strings.get(key) ?? fail(`Unknown string "${key}"`)
}

function partial(name: string): string {
  return readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8').replace(/\n$/, '')
}

interface Context {
  strings: Strings
  links: Record<string, string>
  values: Record<string, string>
  where: string
}

function render(template: string, context: Context): string {
  const withPartials = template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name: string) =>
    partial(name),
  )
  return withPartials.replace(/\{\{([tav])\s+([^}\s]+)\s*\}\}/g, (_, kind: string, key: string) => {
    if (kind === 'v') return context.values[key] ?? fail(`${context.where}: no value "${key}"`)
    const text = fill(get(context.strings, key), context.links)
    return kind === 't' ? rich(text, `${context.where} ${key}`) : plain(text)
  })
}

function formatDate(date: Date, locale: Locale): string {
  // English keeps the site's own day-month-year order.
  const tag = locale.code === 'en' ? 'en-GB' : locale.lang
  return new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

interface Build {
  assets: Map<string, string>
  catalogues: Map<string, Catalogue>
  content: ContentItem[]
}

function renderPage(page: Page | null, locale: Locale, build: Build): string {
  const strings =
    build.catalogues.get(locale.code)?.strings ?? fail(`No strings for ${locale.code}`)
  const path = page?.path ?? ''
  const links: Record<string, string> = {
    home: pageUrl(locale, ''),
    privacy: pageUrl(locale, 'legal/privacy/'),
    terms: pageUrl(locale, 'legal/terms/'),
    support: `${pageUrl(locale, '')}#questions`,
    donate: DONATE_URL,
    email: `mailto:${EMAIL}`,
    english: pageUrl(ENGLISH, path),
    year: String(new Date().getUTCFullYear()),
    date: page?.updated ? formatDate(page.updated, locale) : '',
  }
  const titleKey = page?.titleKey ?? 'notFound.pageTitle'
  const title = plain(get(strings, titleKey))
  const description = plain(get(strings, page?.descriptionKey ?? 'home.description'))

  const values: Record<string, string> = {
    lang: locale.lang,
    dir: locale.dir,
    code: locale.code,
    title,
    description,
    themeScript: `<script>${THEME_SCRIPT}</script>`,
    seo: page ? seo(page, locale, strings, title, description) : '',
    // Amiri is above the fold only where it sets the body text.
    preload:
      locale.code === 'ar'
        ? `    <link rel="preload" href="${build.assets.get('Amiri-Regular.woff2') ?? fail('No Amiri')}" as="font" type="font/woff2" crossorigin />`
        : '',
    jsonLd: page?.id === 'home' ? jsonLd(locale, strings) : '',
    languageMenu: languageMenu(
      page ?? PAGES[0] ?? fail('No pages'),
      locale,
      strings,
      build.catalogues,
    ),
    'current:privacy': page?.id === 'privacy' ? 'aria-current="page"' : '',
    'current:terms': page?.id === 'terms' ? 'aria-current="page"' : '',
    governs:
      page?.updated && locale.code !== 'en'
        ? `        <p class="governs">${rich(fill(get(strings, 'common.governs'), links), 'common.governs')}</p>\n`
        : '',
    specimen:
      page?.id === 'home'
        ? specimenHtml(specimenDuas(locale, strings, build.content), strings)
        : '',
  }
  for (const [name, url] of Object.entries(links)) values[`url:${name}`] = url
  for (const [name, url] of build.assets) values[`asset:${name}`] = url

  const template = readFileSync(join(SRC, page?.template ?? '404.html'), 'utf8')
  return render(template, { strings, links, values, where: `${locale.code}/${path}` })
}

/** Inline <style> blocks seen in the output, each allowed in the CSP by hash. */
const inlineStyles = new Set<string>()

/** The CSP allows one inline script by hash; any other would be blocked. */
function checkInline(html: string, where: string): void {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    if (match[1] !== THEME_SCRIPT)
      problems.push(`${where}: an inline script the CSP does not allow`)
  }
  for (const match of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) inlineStyles.add(match[1] ?? '')
  if (/\sstyle="/.test(html)) problems.push(`${where}: a style attribute the CSP does not allow`)
}

function write(path: string, contents: string): void {
  if (path.endsWith('.html')) checkInline(contents, path)
  const file = join(DIST, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
}

// ---- Site files: sitemap, robots, manifest, host headers ----

function sitemap(): string {
  const urls = PAGES.flatMap((page) =>
    LOCALES.map((locale) => {
      const links = [
        ...LOCALES.map(
          (each) =>
            `    <xhtml:link rel="alternate" hreflang="${each.hreflang}" href="${absolute(pageUrl(each, page.path))}" />`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(pageUrl(ENGLISH, page.path))}" />`,
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

function manifest(): string {
  return `${JSON.stringify(
    {
      name: 'Ihsaanly',
      short_name: 'Ihsaanly',
      start_url: '/',
      display: 'browser',
      background_color: '#f7f0e9',
      theme_color: '#f7f0e9',
      icons: [
        { src: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/assets/star.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2,
  )}\n`
}

function csp(): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${cspHash(THEME_SCRIPT)}`,
    // The demo's noscript fallback carries one inline <style>, allowed by
    // hash like the theme script. Nothing sets a style attribute.
    `style-src 'self' ${[...inlineStyles].map(cspHash).join(' ')}`.trim(),
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

const PERMISSIONS =
  'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'

function htaccess(): string {
  return `# Generated by scripts/build-site.ts: edit there, not here. See site/HOSTING.md.
ErrorDocument 404 /404.html
AddType application/manifest+json .webmanifest
AddType font/woff2 .woff2
AddDefaultCharset utf-8

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "${csp()}"
  Header always set Strict-Transport-Security "max-age=31536000" env=HTTPS
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "${PERMISSIONS}"
  Header always set X-Frame-Options "DENY"
  Header always set Cross-Origin-Opener-Policy "same-origin"

  # Hashed assets never change under the same name.
  <FilesMatch "\\.[0-9a-f]{10}\\.(css|js|woff2|ttf)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(png|svg|txt|map|webmanifest)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  <FilesMatch "\\.(html|xml)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml text/javascript application/javascript application/json application/xml application/manifest+json image/svg+xml font/ttf
</IfModule>
`
}

function headersFile(): string {
  return `# Generated by scripts/build-site.ts for hosts that read _headers (Netlify, Cloudflare Pages).
/*
  Content-Security-Policy: ${csp()}
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: ${PERMISSIONS}
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=2592000

${HASHED.map((name) => `/assets/${name.replace('.', '.*.')}\n  Cache-Control: public, max-age=31536000, immutable`).join('\n\n')}
`
}

// ---- Main ----

async function main(): Promise<void> {
  rmSync(DIST, { recursive: true, force: true })
  mkdirSync(DIST, { recursive: true })

  const english = readStrings('en') ?? fail('site/i18n/en.json is missing')
  const catalogues = new Map(LOCALES.map((locale) => [locale.code, catalogue(locale, english)]))
  const build: Build = { assets: await copyAssets(), catalogues, content: readContent() }

  let pages = 0
  for (const locale of LOCALES) {
    for (const page of PAGES) {
      const prefix = locale.code === 'en' ? '' : `${locale.code}/`
      write(`${prefix}${page.path}index.html`, renderPage(page, locale, build))
      pages += 1
    }
  }
  write('404.html', renderPage(null, ENGLISH, build))
  write('sitemap.xml', sitemap())
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`)
  write('site.webmanifest', manifest())
  write('.htaccess', htaccess())
  write('_headers', headersFile())

  console.log(`Built ${pages + 1} pages in ${LOCALES.length} languages to site/dist/`)
  console.log(`Theme script CSP hash: ${cspHash(THEME_SCRIPT)}`)
  console.log(`\nTranslations (${english.size} English strings):`)
  for (const locale of LOCALES) {
    if (locale.code === 'en') continue
    const { missing, unknown, present } = catalogues.get(locale.code) ?? fail('No catalogue')
    const status = !present
      ? `no i18n/${locale.code}.json, all ${missing.length} fall back to English`
      : missing.length === 0
        ? 'complete'
        : `${missing.length} missing: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ', …' : ''}`
    console.log(`  ${locale.code.padEnd(4)} ${status}`)
    if (unknown.length > 0)
      console.log(`       ${unknown.length} unknown keys: ${unknown.slice(0, 6).join(', ')}`)
  }
  if (problems.length > 0) {
    console.warn(`\n${problems.length} markup problems:`)
    for (const problem of [...new Set(problems)]) console.warn(`  ${problem}`)
    if (problems.some((problem) => problem.startsWith('en/'))) process.exitCode = 1
  }
}

await main()
