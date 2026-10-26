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

/** How many times one page is loaded before a hang fails the check. */
export const CHROME_ATTEMPTS = 3

/** How long stderr may stay open once Chrome itself has exited. */
const STDERR_GRACE_MS = 1000

/**
 * Chrome's console log for one page. Headless Chrome now and then hangs on a
 * CI runner without the page being at fault, so a run that outlives `hangMs`
 * is killed and tried again, up to `CHROME_ATTEMPTS` times.
 *
 * The run ends when Chrome exits, not when its stderr closes: a helper
 * process can hold stderr open after the main one is done, which used to
 * read as a hang. What was logged by then is the page's log.
 */
export async function consoleOf(chrome: string, url: string, hangMs = 12_000): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const run = Bun.spawn(
      [
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        // The usual flags for Chrome in a container: no first-run work, and no
        // reliance on a small /dev/shm.
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-dev-shm-usage',
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
    const chunks: string[] = []
    const decoder = new TextDecoder()
    const reading = (async (): Promise<void> => {
      for await (const chunk of run.stderr) chunks.push(decoder.decode(chunk, { stream: true }))
    })()
    const exited = await Promise.race([run.exited.then(() => true), Bun.sleep(hangMs)])
    if (exited === true) {
      await Promise.race([reading, Bun.sleep(STDERR_GRACE_MS)])
      return chunks.join('')
    }
    run.kill()
    if (attempt === CHROME_ATTEMPTS) {
      throw new Error(`Chrome hung ${CHROME_ATTEMPTS} times loading ${url}`)
    }
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
