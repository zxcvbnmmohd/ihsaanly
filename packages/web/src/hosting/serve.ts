// Serves a built site the way the Apache host will: directory URLs, a
// not-found/SPA-fallback file for anything unknown, and each page's CSP and
// security headers from its HeaderMap. Use it to check a build in a real
// browser.
import { existsSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { COMMON_HEADERS, type HeaderMap, pathPattern, sentAlways } from './csp.ts'

export interface ServeOptions {
  /** The built site's root directory (e.g. dist/client). */
  root: string
  headerMap: HeaderMap
  /** SPA mode: an unmatched path serves `index.html` (200) instead of `notFoundPath` (404). */
  spa?: boolean
  /** Served with a 404 status when `spa` is false. Relative to `root`. */
  notFoundPath?: string
  port?: number
}

export function serve({
  root,
  headerMap,
  spa = false,
  notFoundPath = '404.html',
  port = Number(process.env.PORT ?? 4173),
}: ServeOptions): ReturnType<typeof Bun.serve> {
  function resolve(pathname: string): string | null {
    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
    const file = join(root, safe)
    if (!file.startsWith(root) || !existsSync(file)) return null
    if (statSync(file).isDirectory()) {
      const index = join(file, 'index.html')
      return existsSync(index) ? index : null
    }
    return file
  }

  const server = Bun.serve({
    port,
    fetch(request): Response {
      const { pathname } = new URL(request.url)
      if (!pathname.endsWith('/') && resolve(`${pathname}/index.html`)) {
        return Response.redirect(`${pathname}/`, 301)
      }
      const file = resolve(pathname)
      const headers = new Headers({ ...COMMON_HEADERS, ...headerMap.headers })
      headers.set('Content-Security-Policy', headerMap.pages[pathname] ?? headerMap.fallback)
      for (const [pattern, set] of Object.entries(headerMap.paths ?? {})) {
        if (!pathPattern(pattern).test(pathname)) continue
        for (const [name, value] of Object.entries(set))
          if (file || sentAlways(name)) headers.set(name, value)
      }
      if (!file) {
        headers.set('Content-Type', 'text/html; charset=utf-8')
        if (spa) return new Response(Bun.file(join(root, 'index.html')), { headers })
        return new Response(Bun.file(join(root, notFoundPath)), { status: 404, headers })
      }
      return new Response(Bun.file(file), { headers })
    },
  })

  console.log(`Serving ${root} at http://localhost:${port}/`)
  return server
}
