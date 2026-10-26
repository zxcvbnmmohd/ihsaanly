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

/**
 * Chrome's console log for one page. Headless Chrome now and then hangs on a
 * CI runner without the page being at fault, so a run that outlives `hangMs`
 * is killed and tried once more; a second hang fails the check.
 */
export async function consoleOf(chrome: string, url: string, hangMs = 12_000): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const run = Bun.spawn(
      [
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--virtual-time-budget=3000',
        '--enable-logging=stderr',
        // Ordinary extensions stay out; policy-installed ones (a company's DLP,
        // say) load anyway, which is why pageMessages() filters by source too.
        '--disable-extensions',
        '--v=0',
        '--dump-dom',
        url,
      ],
      { stdout: 'ignore', stderr: 'pipe' },
    )
    // Raced rather than awaited after a kill: Chrome's helper processes can
    // hold stderr open after the main one is gone.
    const log = await Promise.race([new Response(run.stderr).text(), Bun.sleep(hangMs)])
    if (typeof log === 'string') return log
    run.kill()
    if (attempt === 2) throw new Error(`Chrome hung twice loading ${url}`)
  }
}

/**
 * The console messages Chrome logged for pages on `origin`: each
 * `[…:CONSOLE:…] "message", source: URL (line)` entry, which may span lines,
 * kept only when its source is this origin. Extensions installed by policy
 * load even in a throwaway profile and log their own errors; those are not the
 * page's problems.
 */
export function pageMessages(log: string, origin: string): string[] {
  return log
    .split(/\n(?=\[\d+:\d+:)/)
    .filter((entry) => entry.includes(':CONSOLE'))
    .filter((entry) => {
      const source = /source: (\S*) \(\d+\)\s*$/.exec(entry)?.[1] ?? ''
      return source.startsWith(origin)
    })
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
        const messages = pageMessages(log, baseUrl).join('\n')
        expect(messages).not.toContain('Content Security Policy')
        // Hydration or render errors, such as an update loop in the demo.
        expect(messages).not.toMatch(/Uncaught|Error\b/)
      }, 30_000)
    }
  })
}
