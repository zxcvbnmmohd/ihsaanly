// vite.config.ts is evaluated by Vite, not by the app, but the head injection
// is real logic: it writes the canonical URL, the development title prefix and
// the noindex tag, and the pre-paint theme script the CSP hashes.
import { afterEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEV_TITLE_PREFIX, DEVELOPMENT_ROBOTS } from '@ihsaanly/web/app-env'
import { THEME_COLOR, THEME_SCRIPT } from '@ihsaanly/web/theme'
import type { Plugin } from 'vite'
import config, { injectHead } from '../vite.config'

const html = readFileSync(join(import.meta.dir, '..', 'index.html'), 'utf8')

const saved = { env: process.env.VITE_APP_ENV, site: process.env.VITE_SITE_URL }
afterEach(() => {
  if (saved.env === undefined) delete process.env.VITE_APP_ENV
  else process.env.VITE_APP_ENV = saved.env
  if (saved.site === undefined) delete process.env.VITE_SITE_URL
  else process.env.VITE_SITE_URL = saved.site
})

/** Runs the plugin over index.html as Vite would for this command and mode. */
function transform(command: 'build' | 'serve', mode: string): string {
  const plugin = injectHead() as Plugin & {
    configResolved: (config: { command: string; mode: string }) => void
    transformIndexHtml: (html: string) => string
  }
  plugin.configResolved({ command, mode })
  return plugin.transformIndexHtml(html)
}

describe('injectHead', () => {
  it('fills a production build: its own origin, no prefix, no noindex, the theme script', () => {
    delete process.env.VITE_APP_ENV
    process.env.VITE_SITE_URL = 'https://companion.example.test///'
    const out = transform('build', 'production')

    expect(out).toContain('<link rel="canonical" href="https://companion.example.test/" />')
    expect(out).toContain('content="https://companion.example.test/og.png"')
    expect(out).toContain('<title>Ihsaanly · The sunnah that fits the moment</title>')
    expect(out).not.toContain('name="robots"')
    expect(out).toContain(`<script>${THEME_SCRIPT}</script>`)
    expect(out).not.toMatch(
      /__(?:SITE_URL|TITLE_PREFIX)__|<!--(?:robots|theme-script|apple-itunes-app)-->/,
    )
    expect(out).not.toContain('apple-itunes-app" content')
  })

  it('defaults to the production origin when none is given', () => {
    delete process.env.VITE_SITE_URL
    expect(transform('build', 'production')).toContain('href="https://companion.ihsaanly.app/"')
  })

  it('marks a development build in the title and keeps it out of search results', () => {
    process.env.VITE_APP_ENV = 'development'
    const out = transform('build', 'production')
    expect(out).toContain(
      `<title>${DEV_TITLE_PREFIX}Ihsaanly · The sunnah that fits the moment</title>`,
    )
    expect(out).toContain(`<meta name="robots" content="${DEVELOPMENT_ROBOTS}" />`)
  })

  it('treats the dev server as a development build unless told otherwise', () => {
    delete process.env.VITE_APP_ENV
    expect(transform('serve', 'development')).toContain(DEV_TITLE_PREFIX)
    process.env.VITE_APP_ENV = 'production'
    expect(transform('serve', 'development')).not.toContain(DEV_TITLE_PREFIX)
  })

  it('writes the brand theme colours into the meta tags', () => {
    const out = transform('build', 'production')
    expect(out).toContain(`content="${THEME_COLOR.light}" media="(prefers-color-scheme: light)"`)
    expect(out).toContain(`content="${THEME_COLOR.dark}" media="(prefers-color-scheme: dark)"`)
  })
})

describe('the config', () => {
  it('serves on 3003, aliases ~/ to src, and wires the head, Tailwind, router and React plugins in order', () => {
    const resolved = config as {
      server: { port: number }
      resolve: { alias: { find: RegExp; replacement: string }[] }
      plugins: { name?: string }[]
    }
    expect(resolved.server.port).toBe(3003)
    const alias = resolved.resolve.alias.find((entry) => String(entry.find) === '/^~\\//')
    expect(alias?.replacement).toBe(`${join(import.meta.dir, '..', 'src')}/`)
    const names = resolved.plugins.flat().map((plugin) => plugin.name ?? '')
    const inject = names.indexOf('ihsaanly:inject-head')
    const router = names.findIndex((name) => name.includes('tanstack-router'))
    const react = names.findIndex((name) => name.includes('vite:react'))
    expect(inject).toBeGreaterThanOrEqual(0)
    expect(router).toBeGreaterThan(inject)
    expect(react).toBeGreaterThan(router)
  })
})
