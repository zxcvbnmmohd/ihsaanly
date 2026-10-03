import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { start } from './serve'

let dist = ''
const port = process.env.PORT

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'serve-'))
  mkdirSync(join(dist, 'client'))
  writeFileSync(join(dist, 'client', 'index.html'), '<p>home</p>')
  writeFileSync(join(dist, 'client', '404.html'), '<p>missing</p>')
  writeFileSync(
    join(dist, 'headers.json'),
    JSON.stringify({ pages: { '/': "default-src 'self'" }, fallback: "default-src 'none'" }),
  )
  process.env.PORT = '0'
})
afterEach(() => {
  rmSync(dist, { recursive: true, force: true })
  if (port === undefined) delete process.env.PORT
  else process.env.PORT = port
})

test('serves dist/client with the page policies from dist/headers.json', async () => {
  const server = start(dist)
  try {
    const home = await fetch(new URL('/', server.url))
    expect(await home.text()).toBe('<p>home</p>')
    expect(home.headers.get('content-security-policy')).toBe("default-src 'self'")

    const missing = await fetch(new URL('/nope/', server.url))
    expect(missing.status).toBe(404)
    expect(await missing.text()).toBe('<p>missing</p>')
    expect(missing.headers.get('content-security-policy')).toBe("default-src 'none'")
  } finally {
    await server.stop(true)
  }
})
