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

export function pageCsp({ scripts, styles }: Inline): string {
  return [
    "default-src 'self'",
    `script-src ${sources(scripts)}`,
    `style-src ${sources(styles, RUNTIME_STYLES)}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export const COMMON_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

/** What postbuild writes to dist/headers.json, and what serve.ts and the tests read. */
export interface HeaderMap {
  /** URL path (e.g. /ar/legal/terms/) → that page's policy. */
  pages: Record<string, string>
  /** For any other path: the 404 page's policy, since the host serves 404.html there. */
  fallback: string
}
