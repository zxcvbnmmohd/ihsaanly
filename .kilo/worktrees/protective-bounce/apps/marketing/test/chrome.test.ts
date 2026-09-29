// Loads pages in headless Chrome under the headers the host will send, and
// fails on any Content-Security-Policy violation or uncaught script error. Skipped where Chrome is absent.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
const chrome = CANDIDATES.find((path): path is string => Boolean(path && existsSync(path)))
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

async function consoleOf(path: string): Promise<string> {
  const run = Bun.spawn(
    [
      chrome ?? '',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=3000',
      '--enable-logging=stderr',
      '--v=0',
      '--dump-dom',
      `http://localhost:${PORT}${path}`,
    ],
    { stdout: 'ignore', stderr: 'pipe' },
  )
  return new Response(run.stderr).text()
}

describe.skipIf(!chrome)('no CSP violations or script errors in Chrome', () => {
  for (const path of PAGES) {
    test(path, async () => {
      const log = await consoleOf(path)
      expect(log).not.toContain('Content Security Policy')
      // Hydration or render errors, such as an update loop in the demo.
      expect(log).not.toMatch(/CONSOLE[^\n]*(?:Uncaught|Error\b)/)
    }, 20_000)
  }
})
