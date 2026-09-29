// Loads pages in headless Chrome under the headers the host will send, and
// fails on any Content-Security-Policy violation or uncaught script error.
// The Chrome-driving check itself is @ihsaanly/web/hosting/chrome; this file
// only starts the preview server and owns the page list.
import { afterAll, beforeAll } from 'bun:test'
import { join } from 'node:path'
import { describeChromePages, findChrome } from '@ihsaanly/web/hosting/chrome'

const chrome = findChrome()
const PORT = 4300 + Math.floor(Math.random() * 500)
const PAGES = ['/', '/ar/', '/zh/legal/privacy/', '/fr/legal/terms/', '/missing/']

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
