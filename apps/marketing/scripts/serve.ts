// Serves dist/client the way the Apache host will. Use it to check a build in
// a real browser: `bun run preview`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { serve } from '@ihsaanly/web/hosting/serve'

const root = join(import.meta.dir, '..', 'dist')

serve({
  root: join(root, 'client'),
  headerMap: JSON.parse(readFileSync(join(root, 'headers.json'), 'utf8')) as HeaderMap,
})
