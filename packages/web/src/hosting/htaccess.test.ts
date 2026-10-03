import { describe, expect, test } from 'bun:test'
import { buildHeadersFile, buildHtaccess } from './htaccess.ts'

const headerMap = {
  pages: {
    '/': "default-src 'self'",
    '/ar/legal': 'policy "quoted"',
    '/404.html': 'not-found-policy',
  },
  fallback: 'fallback-policy',
}

describe('buildHtaccess', () => {
  const out = buildHtaccess({ headerMap, notFoundPath: '/404.html' })

  test('sets the common headers, HSTS only over https, and the fallback policy', () => {
    expect(out).toContain(
      'Header always set Strict-Transport-Security "max-age=31536000" env=HTTPS',
    )
    expect(out).toContain('Header always set X-Frame-Options "DENY"')
    expect(out).toContain('Header always set Content-Security-Policy "fallback-policy"')
  })

  test('gives each page, in both spellings, its policy and escapes quotes', () => {
    expect(out).toContain(`<If "%{REQUEST_URI} -in {'/', '/index.html'}">`)
    expect(out).toContain(`<If "%{REQUEST_URI} -in {'/ar/legal'}">`)
    expect(out).toContain('Content-Security-Policy "policy \\"quoted\\""')
  })

  test('leaves the 404 page to the fallback and names it as the error document', () => {
    expect(out).not.toContain('not-found-policy')
    expect(out.split('\n')[1]).toBe('ErrorDocument 404 /404.html')
  })

  test('has no SPA rewrite or error document unless asked', () => {
    const plain = buildHtaccess({ headerMap })
    expect(plain).not.toContain('ErrorDocument')
    expect(plain).not.toContain('REQUEST_FILENAME')
  })

  test('rewrites unknown paths to the SPA fallback', () => {
    const spa = buildHtaccess({ headerMap, spaFallback: '/index.html' })
    expect(spa).toContain('RewriteCond %{REQUEST_FILENAME} !-f')
    expect(spa).toContain('RewriteRule ^ /index.html [L]')
  })

  test('adds extra types after the defaults and lets site headers replace common ones', () => {
    const custom = buildHtaccess({
      headerMap: { ...headerMap, headers: { 'X-Frame-Options': 'SAMEORIGIN' } },
      extraAddTypes: [{ type: 'application/wasm', extension: '.wasm' }],
    })
    expect(custom).toContain('AddType font/woff2 .woff2\nAddType application/wasm .wasm')
    expect(custom).toContain('X-Frame-Options "SAMEORIGIN"')
    expect(custom).not.toContain('X-Frame-Options "DENY"')
  })
})

describe('buildHeadersFile', () => {
  const out = buildHeadersFile({ ...headerMap, headers: { 'X-Frame-Options': 'SAMEORIGIN' } })

  test('lists common headers with site overrides, never a global CSP', () => {
    expect(out).toContain('/*\n  Strict-Transport-Security: max-age=31536000')
    expect(out).toContain('X-Frame-Options: SAMEORIGIN')
    expect(out).not.toContain('X-Frame-Options: DENY')
    expect(out).toContain('/assets/*\n  Cache-Control')
  })

  test('sets the policy per page spelling', () => {
    expect(out).toContain("/\n  Content-Security-Policy: default-src 'self'")
    expect(out).toContain("/index.html\n  Content-Security-Policy: default-src 'self'")
    expect(out).toContain('/ar/legal\n  Content-Security-Policy: policy "quoted"')
  })
})

describe('path headers', () => {
  const paths = {
    '/data/index.json': { 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
    '/data/:version/*': { 'Cache-Control': 'public, max-age=31536000, immutable' },
  }

  test('Apache sets them in an <If> after the cache tiers, CORS on every response', () => {
    const out = buildHtaccess({ headerMap: { ...headerMap, paths } })
    const rule = out.indexOf('<If "%{REQUEST_URI} =~ m#^/data/index\\.json$#">')
    expect(rule).toBeGreaterThan(out.indexOf('<FilesMatch "\\.(html|xml|json)$">'))
    expect(out).toContain(
      '    Header set Cache-Control "no-cache"\n    Header always set Access-Control-Allow-Origin "*"\n  </If>',
    )
    expect(out).toContain(
      '<If "%{REQUEST_URI} =~ m#^/data/[^/]+/.*$#">\n    Header set Cache-Control "public, max-age=31536000, immutable"',
    )
  })

  test('_headers lists each pattern as it is', () => {
    const out = buildHeadersFile({ ...headerMap, paths })
    expect(out).toContain(
      '/data/index.json\n  Cache-Control: no-cache\n  Access-Control-Allow-Origin: *\n',
    )
    expect(out).toContain('/data/:version/*\n  Cache-Control: public, max-age=31536000, immutable')
  })

  test('none are written unless asked', () => {
    expect(buildHtaccess({ headerMap })).not.toContain('=~')
  })
})
