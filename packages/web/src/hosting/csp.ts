// The Content-Security-Policy for one prerendered page. TanStack Start writes a
// different inline hydration script into every page, so each page gets its own
// policy listing the sha256 of exactly the inline scripts and styles it holds.
import { createHash } from 'node:crypto'

const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g
const INLINE_STYLE = /<style(\s[^>]*)?>([\s\S]*?)<\/style>/g
// Data blocks are never executed, so the policy does not need to allow them.
const DATA_TYPE = /\stype="application\/(?:ld\+)?json"/

// The HTML parser turns U+0000 inside a script into U+FFFD before the browser
// hashes it, and TanStack's match ids contain U+0000, so hash what the browser sees.
function asParsed(text: string): string {
  return text.replaceAll('\u0000', '�')
}

export function cspHash(text: string): string {
  return `'sha256-${createHash('sha256').update(asParsed(text)).digest('base64')}'`
}

export interface Inline {
  scripts: string[]
  styles: string[]
}

export function inlineBlocks(html: string): Inline {
  const scripts: string[] = []
  for (const [, attributes = '', body = ''] of html.matchAll(INLINE_SCRIPT)) {
    if (/\ssrc=/.test(attributes) || DATA_TYPE.test(attributes)) continue
    scripts.push(body)
  }
  const styles = [...html.matchAll(INLINE_STYLE)].map(([, , body = '']) => body)
  return { scripts, styles }
}

function sources(bodies: string[], extra: string[] = []): string {
  return ["'self'", ...new Set(bodies.map(cspHash)), ...extra].join(' ')
}

// react-native-web creates one <style> element at runtime and fills it with a
// fixed preamble before switching to insertRule (CSSOM, which CSP allows).
// These are the hashes of that element's two text states. The Chrome test
// fails if a react-native-web upgrade changes them.
const RUNTIME_STYLES = [
  "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
  "'sha256-Rpmxwltlfme8WzVMuwiKY7VgrlVoM5dc8GMiTqaLo3M='",
]

export interface PageCspOptions {
  /**
   * Extra directives merged in after the defaults, keyed by directive name
   * (e.g. `'worker-src'`). A key already in the defaults replaces that
   * directive's value in place; a new key is appended at the end (before
   * `upgrade-insecure-requests`).
   */
  directives?: Record<string, string>
  /** Set false to drop `upgrade-insecure-requests` (an SPA served only over https may not need it). */
  upgradeInsecureRequests?: boolean
}

export function pageCsp({ scripts, styles }: Inline, options: PageCspOptions = {}): string {
  const defaults: Record<string, string> = {
    'default-src': "'self'",
    'script-src': sources(scripts),
    'style-src': sources(styles, RUNTIME_STYLES),
    'img-src': "'self' data:",
    'font-src': "'self'",
    'connect-src': "'self'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'none'",
    'frame-ancestors': "'none'",
  }
  const merged = { ...defaults, ...options.directives }
  const parts = Object.entries(merged).map(([name, value]) => `${name} ${value}`)
  if (options.upgradeInsecureRequests ?? true) parts.push('upgrade-insecure-requests')
  return parts.join('; ')
}

/** `Permissions-Policy` value: every feature denied by default, with overrides merged in place. */
export function permissionsPolicy(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    accelerometer: '()',
    camera: '()',
    geolocation: '()',
    gyroscope: '()',
    magnetometer: '()',
    microphone: '()',
    payment: '()',
    usb: '()',
  }
  const merged = { ...defaults, ...overrides }
  return Object.entries(merged)
    .map(([name, value]) => `${name}=${value}`)
    .join(', ')
}

export const COMMON_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': permissionsPolicy(),
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

/** What postbuild writes to dist/headers.json, and what serve.ts and the tests read. */
export interface HeaderMap {
  /** URL path (e.g. /ar/legal/terms/) → that page's policy. */
  pages: Record<string, string>
  /** For any other path: the 404 page's policy, since the host serves 404.html there. */
  fallback: string
  /** Replaces entries of COMMON_HEADERS for this site (e.g. a Permissions-Policy allowing geolocation). */
  headers?: Record<string, string>
  /**
   * Extra headers for the files under a path pattern, in Netlify's syntax:
   * `:name` is one path segment and a trailing `*` anything after it. They
   * replace the cache tiers, and patterns must not overlap (Netlify would
   * join the values). Sent with successful responses only, except
   * `Access-Control-*`, which every response carries so a cross-origin
   * client can read an error too.
   */
  paths?: Record<string, Record<string, string>>
}

/** A `paths` pattern as anchored regular-expression source over the URL path (PCRE and JS alike). */
export function pathRegex(pattern: string): string {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '*') return '.*'
      if (segment.startsWith(':')) return '[^/]+'
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return `^${source}$`
}

/** A `paths` pattern as an anchored RegExp over the URL path. */
export function pathPattern(pattern: string): RegExp {
  return new RegExp(pathRegex(pattern))
}

/** Whether a `paths` header is sent with error responses too. */
export function sentAlways(name: string): boolean {
  return name.toLowerCase().startsWith('access-control-')
}
