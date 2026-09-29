// Loads pages in headless Chrome under the headers the host will send, and
// fails on any Content-Security-Policy violation or uncaught script error.
// Skipped where Chrome is absent. The caller starts (and stops) its own
// server and supplies its base URL and page list; this only drives Chrome.
import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

/** The first installed Chrome/Chromium binary this environment offers, or undefined to skip the check. */
export function findChrome(): string | undefined {
  return CANDIDATES.find((path): path is string => Boolean(path && existsSync(path)))
}

async function consoleOf(chrome: string, url: string): Promise<string> {
  const run = Bun.spawn(
    [
      chrome,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=3000',
      '--enable-logging=stderr',
      '--v=0',
      '--dump-dom',
      url,
    ],
    { stdout: 'ignore', stderr: 'pipe' },
  )
  return new Response(run.stderr).text()
}

export interface ChromePagesOptions {
  /** The running server's origin, e.g. `http://localhost:4300`. */
  baseUrl: string
  /** URL paths to load, e.g. `['/', '/ar/']`. */
  pages: string[]
  /** Overrides Chrome discovery; defaults to `findChrome()`. */
  chrome?: string | undefined
}

/** Registers one bun:test per page: fails on a CSP violation or an uncaught script/render error. */
export function describeChromePages({
  baseUrl,
  pages,
  chrome = findChrome(),
}: ChromePagesOptions): void {
  describe.skipIf(!chrome)('no CSP violations or script errors in Chrome', () => {
    for (const path of pages) {
      test(path, async () => {
        const log = await consoleOf(chrome ?? '', `${baseUrl}${path}`)
        expect(log).not.toContain('Content Security Policy')
        // Hydration or render errors, such as an update loop in the demo.
        expect(log).not.toMatch(/CONSOLE[^\n]*(?:Uncaught|Error\b)/)
      }, 20_000)
    }
  })
}
