import { afterAll, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A stand-in "Chrome": prints its last argument (the URL) as a console line.
const dir = mkdtempSync(join(tmpdir(), 'chrome-'))
const fakeChrome = join(dir, 'chrome')
writeFileSync(fakeChrome, '#!/bin/sh\nfor last; do :; done\necho "[CONSOLE] loaded $last" >&2\n')
chmodSync(fakeChrome, 0o755)
afterAll(() => rmSync(dir, { recursive: true, force: true }))

process.env.CHROME_PATH = fakeChrome
const { describeChromePages, findChrome, pageMessages } = await import('./chrome.ts')

describe('findChrome', () => {
  test('prefers CHROME_PATH when it exists', () => {
    expect(findChrome()).toBe(fakeChrome)
  })
})

describe('pageMessages', () => {
  // Real lines from a machine with a policy-installed DLP extension.
  const log = [
    '[1:2:1003/120125.506472:INFO:CONSOLE:3] "Data leakage prevention for chrome is on!", source: chrome-extension://aif/background.js (3)',
    "[1:2:1003/120125.512516:INFO:CONSOLE:0] \"Error handling response: TypeError: Cannot read properties of undefined (reading 'mapSize')",
    '    at chrome-extension://aif/background.js:181:35", source:  (0)',
    '[1:2:1003/120125.598579:ERROR:base/process/process_mac.cc:53] task_policy_set: invalid argument (4)',
    '[1:2:1003/120125.600000:INFO:CONSOLE:12] "Uncaught TypeError: boom", source: http://localhost:4571/assets/index.js (12)',
    '[1:2:1003/120125.610000:INFO:CONSOLE:0] "Refused to connect because it violates the following Content Security Policy directive", source: http://localhost:4571/today (0)',
  ].join('\n')

  test("keeps only the page's own console messages", () => {
    const messages = pageMessages(log, 'http://localhost:4571')
    expect(messages).toHaveLength(2)
    expect(messages.join('\n')).toContain('Uncaught TypeError: boom')
    expect(messages.join('\n')).toContain('Content Security Policy')
  })

  test("ignores an extension's errors and Chrome's own log lines", () => {
    const joined = pageMessages(log, 'http://localhost:4571').join('\n')
    expect(joined).not.toContain('mapSize')
    expect(joined).not.toContain('task_policy_set')
    expect(pageMessages(log, 'http://localhost:9999')).toEqual([])
  })
})

// Registers a real test per page, run against the stand-in.
describeChromePages({ baseUrl: 'http://localhost:1', pages: ['/', '/ar/'], chrome: fakeChrome })
// And once more through the default discovery.
describeChromePages({ baseUrl: 'http://localhost:1', pages: ['/default'] })
