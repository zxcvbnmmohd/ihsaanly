// Serves dist/client the way the Apache host will. Use it to check a build in
// a real browser: `bun run preview`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { serve } from '@ihsaanly/web/hosting/serve'

/** Serves `<dist>/client` with the per-page headers `<dist>/headers.json` holds. */
export function start(dist: string): ReturnType<typeof serve> {
  return serve({
    root: join(dist, 'client'),
    headerMap: JSON.parse(readFileSync(join(dist, 'headers.json'), 'utf8')) as HeaderMap,
  })
}

if (import.meta.main) start(join(import.meta.dir, '..', 'dist'))
