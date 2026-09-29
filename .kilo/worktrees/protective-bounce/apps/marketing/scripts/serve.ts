// Serves dist/client the way the Apache host will: directory URLs, /404.html for
// anything unknown, and each page's CSP and security headers from headers.json.
// Use it to check a build in a real browser: `bun run preview`.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { COMMON_HEADERS, type HeaderMap } from './csp.ts'

const ROOT = join(import.meta.dir, '..', 'dist')
const CLIENT = join(ROOT, 'client')
const map: HeaderMap = JSON.parse(readFileSync(join(ROOT, 'headers.json'), 'utf8'))
const port = Number(process.env.PORT ?? 4173)

function resolve(pathname: string): string | null {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(CLIENT, safe)
  if (!file.startsWith(CLIENT) || !existsSync(file)) return null
  if (statSync(file).isDirectory()) {
    const index = join(file, 'index.html')
    return existsSync(index) ? index : null
  }
  return file
}

Bun.serve({
  port,
  fetch(request): Response {
    const { pathname } = new URL(request.url)
    if (!pathname.endsWith('/') && resolve(`${pathname}/index.html`)) {
      return Response.redirect(`${pathname}/`, 301)
    }
    const file = resolve(pathname)
    const headers = new Headers(COMMON_HEADERS)
    headers.set('Content-Security-Policy', map.pages[pathname] ?? map.fallback)
    if (!file) {
      headers.set('Content-Type', 'text/html; charset=utf-8')
      return new Response(Bun.file(join(CLIENT, '404.html')), { status: 404, headers })
    }
    return new Response(Bun.file(file), { headers })
  },
})

console.log(`Serving dist/client at http://localhost:${port}/`)
