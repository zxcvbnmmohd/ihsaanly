// Renders the per-language Open Graph images, public/assets/og-<code>.png, by
// screenshotting a small HTML page per locale with the local Chrome. The PNGs
// are committed: rerun `bun run og` when the share copy changes (CI does not).
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brand, fonts } from '@ihsaanly/tailwind/tokens'
import { LOCALES, type Locale } from '../src/i18n/locales.ts'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT = join(import.meta.dir, '..')
const OUT = join(ROOT, 'public', 'assets')
const AMIRI = join(ROOT, '..', '..', 'tooling', 'tailwind', 'fonts', 'Amiri-Regular.ttf')
const WORK = join(tmpdir(), 'ihsaanly-og')

type Strings = Record<string, string>

function flatten(value: unknown, prefix = '', into: Strings = {}): Strings {
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === '_comment' || key.endsWith('_comment')) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') into[path] = child
    else flatten(child, path, into)
  }
  return into
}

function strings(code: string): Strings {
  const read = (each: string): Strings =>
    flatten(JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'messages', `${each}.json`), 'utf8')))
  return { ...read('en'), ...read(code) }
}

/** Message text without its inline markup, escaped for HTML. */
function text(value: string | undefined): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
}

function stack(locale: Locale): string {
  switch (locale.code) {
    case 'ar':
      return fonts.arabic.web
    case 'ur':
      return fonts.urdu.web
    case 'ja':
      return fonts.japanese.web
    case 'hi':
      return fonts.devanagari.web
    case 'zh':
      return fonts['chinese-hans'].web
    case 'yue':
      return fonts['chinese-hant'].web
    default:
      return fonts.serif.web
  }
}

const STAR =
  'M50 7.6 62.4 20H80v17.6L92.4 50 80 62.4V80H62.4L50 92.4 37.6 80H20V62.4L7.6 50 20 37.6V20h17.6Z'

function page(locale: Locale): string {
  const s = strings(locale.code)
  const c = (name: keyof typeof brand): string => brand[name].light
  const rtl = locale.dir === 'rtl'
  const start = rtl ? 'right' : 'left'
  const end = rtl ? 'left' : 'right'
  return `<!doctype html>
<html lang="${locale.lang}" dir="${locale.dir}">
<head><meta charset="utf-8">
<style>
@font-face { font-family: 'Amiri'; src: url('file://${AMIRI}'); }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; background: linear-gradient(160deg, ${c('wash-top')}, ${c('wash-bottom')});
  color: ${c('ink')}; font-family: ${fonts.serif.web}; }
.big { position: absolute; top: 122px; ${end}: -88px; width: 516px; height: 516px; }
.brand { position: absolute; top: 78px; ${start}: 88px; display: flex; align-items: center; gap: 22px;
  font-size: 42px; direction: ltr; }
.brand svg { width: 54px; height: 54px; }
h1 { position: absolute; top: 190px; ${start}: 88px; width: 770px; height: 250px; margin: 0;
  display: flex; align-items: center; font-weight: 400; font-size: 70px; line-height: 1.18;
  font-family: ${stack(locale)}; }
h1 span { display: block; }
.line { position: absolute; top: 520px; ${start}: 88px; width: 700px; font-size: 28px;
  color: ${c('ink-soft')}; font-family: ${stack(locale)}; white-space: nowrap; }
.word { position: absolute; top: 500px; ${end}: 96px; font-family: 'Amiri', serif; font-size: 44px;
  color: ${c('accent')}; }
</style></head>
<body>
<svg class="big" viewBox="0 0 100 100"><path d="${STAR}" fill="none" stroke="${c('accent')}"
  stroke-opacity="0.16" stroke-width="5" stroke-linejoin="round"/></svg>
<div class="brand"><svg viewBox="0 0 100 100"><path d="${STAR}" fill="none" stroke="${c('accent')}"
  stroke-width="6" stroke-linejoin="round"/></svg><span>Ihsaanly</span></div>
<h1><span id="title">${text(s['home.hero.title'])}</span></h1>
<div class="line" id="line">${text(s['home.private.title'])} · ${text(s['home.calm.title'])}</div>
<div class="word" lang="ar" dir="rtl">إحسان</div>
<script>
// Long translations shrink until they fit their box.
document.fonts.ready.then(() => {
  for (const [id, box] of [['title', 250], ['line', 60]]) {
    const el = document.getElementById(id)
    let size = parseFloat(getComputedStyle(el).fontSize)
    while ((el.scrollHeight > box || el.scrollWidth > el.parentElement.clientWidth) && size > 20) {
      size -= 2
      el.style.fontSize = size + 'px'
    }
  }
})
</script>
</body></html>
`
}

mkdirSync(WORK, { recursive: true })
for (const locale of LOCALES) {
  const html = join(WORK, `og-${locale.code}.html`)
  const png = join(OUT, `og-${locale.code}.png`)
  writeFileSync(html, page(locale))
  const run = spawnSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=3000',
    '--allow-file-access-from-files',
    `--screenshot=${png}`,
    `file://${html}`,
  ])
  if (run.status !== 0) throw new Error(`Chrome failed for ${locale.code}: ${run.stderr}`)
  console.log(`wrote ${png}`)
}
