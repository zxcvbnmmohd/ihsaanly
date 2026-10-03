import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  COMMON_HEADERS,
  cspHash,
  inlineBlocks,
  pageCsp,
  pathPattern,
  permissionsPolicy,
  sentAlways,
} from './csp.ts'

const sha = (text: string): string =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`

describe('cspHash', () => {
  test('is the quoted sha256 of the text', () => {
    expect(cspHash('alert(1)')).toBe(sha('alert(1)'))
  })

  test('hashes U+0000 as the U+FFFD the HTML parser turns it into', () => {
    expect(cspHash('a\u0000b')).toBe(sha('a�b'))
  })
})

describe('inlineBlocks', () => {
  test('collects inline scripts and styles', () => {
    const html = '<script>a()</script><style>p{}</style><script type="module">b()</script>'
    expect(inlineBlocks(html)).toEqual({ scripts: ['a()', 'b()'], styles: ['p{}'] })
  })

  test('skips external scripts and JSON data blocks', () => {
    const html =
      '<script src="/x.js"></script><script type="application/json">{}</script><script type="application/ld+json">{}</script>'
    expect(inlineBlocks(html).scripts).toEqual([])
  })

  test('tolerates tags with no attributes or body', () => {
    expect(inlineBlocks('<script></script><style></style>')).toEqual({
      scripts: [''],
      styles: [''],
    })
  })
})

describe('pageCsp', () => {
  const inline = { scripts: ['a()', 'a()'], styles: ['p{}'] }

  test('lists each distinct inline script hash once, plus the runtime style hashes', () => {
    const csp = pageCsp(inline)
    expect(csp).toContain(`script-src 'self' ${sha('a()')};`)
    expect(csp.match(/sha256-/g)?.length).toBe(1 + 1 + 2)
    expect(csp).toContain(`style-src 'self' ${sha('p{}')} 'sha256-47DEQpj8`)
    expect(csp).toContain("object-src 'none'")
    expect(csp.endsWith('; upgrade-insecure-requests')).toBe(true)
  })

  test('merges directives in place or appends new ones before upgrade-insecure-requests', () => {
    const csp = pageCsp(inline, {
      directives: { 'connect-src': "'self' https://api.test", 'worker-src': "'self'" },
    })
    expect(csp).toContain("connect-src 'self' https://api.test;")
    expect(csp).not.toContain("connect-src 'self';")
    expect(csp).toContain("frame-ancestors 'none'; worker-src 'self'; upgrade-insecure-requests")
  })

  test('can drop upgrade-insecure-requests', () => {
    expect(pageCsp(inline, { upgradeInsecureRequests: false })).not.toContain(
      'upgrade-insecure-requests',
    )
  })
})

describe('permissionsPolicy', () => {
  test('denies every feature by default', () => {
    expect(permissionsPolicy()).toBe(
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    )
    expect(COMMON_HEADERS['Permissions-Policy']).toBe(permissionsPolicy())
  })

  test('overrides replace in place and new features are appended', () => {
    const policy = permissionsPolicy({ geolocation: '(self)', fullscreen: '(self)' })
    expect(policy).toContain('geolocation=(self)')
    expect(policy).not.toContain('geolocation=()')
    expect(policy.endsWith('fullscreen=(self)')).toBe(true)
  })
})

describe('pathPattern', () => {
  test('matches one segment for :name and the rest for *, anchored and literal otherwise', () => {
    const exact = pathPattern('/content/manifest.json')
    expect(exact.test('/content/manifest.json')).toBe(true)
    expect(exact.test('/content/manifestXjson')).toBe(false)
    expect(exact.test('/x/content/manifest.json')).toBe(false)
    const folder = pathPattern('/content/:version/*')
    expect(folder.test('/content/v0123/translations/ar.json')).toBe(true)
    expect(folder.test('/content/manifest.json')).toBe(false)
  })

  test('only Access-Control headers are sent with errors', () => {
    expect(sentAlways('Access-Control-Allow-Origin')).toBe(true)
    expect(sentAlways('Cache-Control')).toBe(false)
  })
})
