import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { COMMON_HEADERS } from './csp.ts'
import { serve } from './serve.ts'

const headerMap = {
  pages: { '/': 'home-policy', '/docs/': 'docs-policy' },
  fallback: 'fallback-policy',
  headers: { 'X-Frame-Options': 'SAMEORIGIN' },
  paths: {
    '/docs/:version/*': {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
}

const parent = mkdtempSync(join(tmpdir(), 'serve-'))
const root = join(parent, 'site')
mkdirSync(join(root, 'docs'), { recursive: true })
mkdirSync(join(root, 'empty'))
writeFileSync(join(root, 'index.html'), 'HOME')
writeFileSync(join(root, '404.html'), 'NOT FOUND')
writeFileSync(join(root, 'docs/index.html'), 'DOCS')
writeFileSync(join(root, 'app.txt'), 'APP')
mkdirSync(join(root, 'docs/v1'))
writeFileSync(join(root, 'docs/v1/data.json'), '{}')
writeFileSync(join(parent, 'secret.txt'), 'SECRET')

const servers: ReturnType<typeof serve>[] = []
const quiet = (): void => {
  spyOn(console, 'log').mockImplementation(() => {})
}
function start(options: Partial<Parameters<typeof serve>[0]> = {}): string {
  quiet()
  const server = serve({ root, headerMap, port: 0, ...options })
  servers.push(server)
  return `http://localhost:${server.port}`
}

beforeAll(quiet)
afterAll(() => {
  for (const server of servers) server.stop(true)
  rmSync(parent, { recursive: true, force: true })
})

describe('serve', () => {
  test('serves a page with its own policy and the common headers', async () => {
    const response = await fetch(`${start()}/`)
    expect(await response.text()).toBe('HOME')
    expect(response.headers.get('Content-Security-Policy')).toBe('home-policy')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(response.headers.get('X-Content-Type-Options')).toBe(
      COMMON_HEADERS['X-Content-Type-Options'] ?? null,
    )
  })

  test('serves a directory URL from its index.html', async () => {
    const response = await fetch(`${start()}/docs/`)
    expect(await response.text()).toBe('DOCS')
    expect(response.headers.get('Content-Security-Policy')).toBe('docs-policy')
  })

  test('redirects a directory without a trailing slash', async () => {
    const response = await fetch(`${start()}/docs`, { redirect: 'manual' })
    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toContain('/docs/')
  })

  test('serves a plain file with the fallback policy', async () => {
    const response = await fetch(`${start()}/app.txt`)
    expect(await response.text()).toBe('APP')
    expect(response.headers.get('Content-Security-Policy')).toBe('fallback-policy')
  })

  test('answers an unknown path with the not-found page and a 404', async () => {
    const response = await fetch(`${start()}/nope`)
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('NOT FOUND')
    expect(response.headers.get('Content-Type')).toContain('text/html')
  })

  test('adds path headers to the files they match, and only CORS to a miss', async () => {
    const base = start()
    const found = await fetch(`${base}/docs/v1/data.json`)
    expect(found.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(found.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    const missing = await fetch(`${base}/docs/v1/gone.json`)
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(missing.headers.get('Cache-Control')).toBeNull()
    expect((await fetch(`${base}/app.txt`)).headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('a directory with no index.html is not found', async () => {
    expect((await fetch(`${start()}/empty/`)).status).toBe(404)
  })

  test('uses a custom not-found file', async () => {
    const response = await fetch(`${start({ notFoundPath: 'docs/index.html' })}/nope`)
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('DOCS')
  })

  test('SPA mode serves index.html with 200 for an unknown path', async () => {
    const response = await fetch(`${start({ spa: true })}/some/route`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('HOME')
  })

  test('never serves files outside the root', async () => {
    const base = start()
    expect((await fetch(`${base}/..%2fsecret.txt`)).status).toBe(404)
    expect((await fetch(`${base}/%2e%2e/secret.txt`)).status).toBe(404)
  })

  test('takes its port from PORT when none is given', () => {
    const before = process.env.PORT
    process.env.PORT = '0'
    try {
      const server = serve({ root, headerMap })
      servers.push(server)
      expect(server.port).toBeGreaterThan(0)
    } finally {
      if (before === undefined) delete process.env.PORT
      else process.env.PORT = before
    }
  })
})
