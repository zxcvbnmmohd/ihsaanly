// Loads pages in headless Chrome under the headers the host will send, and
// fails on any Content-Security-Policy violation or uncaught script error.
import { afterAll, beforeAll } from 'bun:test'
import { join } from 'node:path'
import { describeChromePages, findChrome } from '@ihsaanly/web/hosting/chrome'

const chrome = findChrome()
const PORT = 4400 + Math.floor(Math.random() * 500)
// A real item id (see packages/core/content/items.json) exercises the SPA
// fallback for a deep, non-root URL.
const PAGES = ['/', '/item/dua-leaving-home', '/more', '/location']

let server: ReturnType<typeof Bun.spawn> | undefined

beforeAll(async () => {
  if (!chrome) return
  server = Bun.spawn(['bun', join(import.meta.dir, '..', 'scripts', 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdout: 'ignore',
  })
  for (let tries = 0; tries < 50; tries++) {
    const up = await fetch(`http://localhost:${PORT}/`).then(
      () => true,
      () => false,
    )
    if (up) return
    await Bun.sleep(100)
  }
})

afterAll(() => server?.kill())

describeChromePages({ baseUrl: `http://localhost:${PORT}`, pages: PAGES, chrome })
