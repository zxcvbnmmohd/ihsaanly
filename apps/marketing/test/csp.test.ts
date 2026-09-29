// Every inline script and style in every page must be allowed by that page's
// own policy, and the Apache and Netlify header files must carry the same one.
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cspHash, type HeaderMap, inlineBlocks } from '@ihsaanly/web/hosting/csp'

const DIST = join(import.meta.dir, '..', 'dist')
const map: HeaderMap = JSON.parse(readFileSync(join(DIST, 'headers.json'), 'utf8'))
const htaccess = readFileSync(join(DIST, 'client', '.htaccess'), 'utf8')
const netlify = readFileSync(join(DIST, 'client', '_headers'), 'utf8')

function fileFor(path: string): string {
  return join(DIST, 'client', path.endsWith('/') ? `${path}index.html` : path)
}

describe('per-page CSP', () => {
  for (const [path, policy] of Object.entries(map.pages)) {
    test(path, () => {
      const { scripts, styles } = inlineBlocks(readFileSync(fileFor(path), 'utf8'))
      expect(scripts.length).toBeGreaterThan(0)
      for (const body of [...scripts, ...styles]) expect(policy).toContain(cspHash(body))
      expect(policy).not.toContain('unsafe-inline')
      expect(policy).not.toContain('unsafe-eval')
      expect(htaccess).toContain(policy.replaceAll('"', '\\"'))
      if (path !== '/404.html') expect(netlify).toContain(policy)
    })
  }

  test('the fallback is the 404 page policy', () => {
    expect(map.fallback).toBe(map.pages['/404.html'] ?? '')
  })

  test('U+0000 is hashed as the browser parses it', () => {
    expect(cspHash('a\u0000b')).toBe(cspHash('a�b'))
  })
})
