// The build config: what gets prerendered, where, and with which aliases.
import { expect, mock, test } from 'bun:test'
import { allPagePaths } from '../src/i18n/locales.ts'

interface PrerenderOptions {
  prerender: {
    enabled: boolean
    filter: (page: { path: string }) => boolean
    crawlLinks: boolean
    failOnError: boolean
    autoSubfolderIndex: boolean
  }
  pages: { path: string; prerender?: { enabled: boolean; outputPath: string } }[]
}

// Start's plugin only needs to hand over the options this config gives it.
let given: PrerenderOptions | null = null
const real = await import('@tanstack/react-start/plugin/vite')
mock.module('@tanstack/react-start/plugin/vite', () => ({
  ...real,
  tanstackStart: (options: PrerenderOptions) => {
    given = options
    return { name: 'tanstack-start-stand-in' }
  },
}))

const { default: config } = await import('../vite.config.ts')

test('serves the dev site on port 3002', () => {
  expect(config.server?.port).toBe(3002)
})

test('~/ points at src/', () => {
  const aliases = (config.resolve?.alias ?? []) as { find: RegExp; replacement: string }[]
  const alias = aliases[0]
  expect(alias?.find.test('~/links')).toBe(true)
  expect(alias?.find.test('other/~/x')).toBe(false)
  expect(alias?.replacement).toBe(new URL('../src/', import.meta.url).pathname)
})

test('start sits before the React plugin, after Tailwind', () => {
  const names = (config.plugins ?? []).flat().map((plugin) => (plugin as { name?: string }).name)
  const start = names.indexOf('tanstack-start-stand-in')
  expect(start).toBeGreaterThan(-1)
  expect(names.indexOf('vite:react-babel')).toBeGreaterThan(start)
  expect(names.some((name) => name?.startsWith('@tailwindcss/vite'))).toBe(true)
})

test("prerenders every language's pages, and the 404 page to /404.html", () => {
  expect(given?.pages.map((page) => page.path).slice(0, -1)).toEqual(allPagePaths())
  expect(given?.pages.at(-1)).toEqual({
    path: '/404/',
    prerender: { enabled: true, outputPath: '/404.html' },
  })
  expect(given?.prerender).toMatchObject({
    enabled: true,
    crawlLinks: true,
    failOnError: true,
    autoSubfolderIndex: true,
  })
})

test('in-page anchors are not prerendered again', () => {
  expect(given?.prerender.filter({ path: '/#questions' })).toBe(false)
  expect(given?.prerender.filter({ path: '/ar/legal/terms/' })).toBe(true)
})
