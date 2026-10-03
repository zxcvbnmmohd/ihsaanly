// Serves dist the way the Apache host will: use it to check a build in a
// real browser (`bun run preview`).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { serve } from '@ihsaanly/web/hosting/serve'

/** Serves the built site in `root` (its headers.json supplies the policy); the port is PORT, or 4173. */
export function preview(root = join(import.meta.dir, '..', 'dist')): ReturnType<typeof serve> {
  return serve({
    root,
    headerMap: JSON.parse(readFileSync(join(root, 'headers.json'), 'utf8')) as HeaderMap,
    spa: true,
  })
}

if (import.meta.main) preview()
