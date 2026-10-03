// The sync suite's webServer: builds the companion against the Firebase
// emulators into SYNC_DIST (when missing, or always with E2E_BUILD=1), then
// serves it with the companion's own scripts/serve.ts, like e2e/support/serve.ts.
//
//   bun e2e/sync/support/serve.ts <port>
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HeaderMap } from '@ihsaanly/web/hosting/csp'
import { appDir } from '../../support/build.ts'
import { AUTH_URL, COMPANION_ENV, FIRESTORE_URL, SYNC_DIST } from './env.ts'

const port = process.argv[2] ?? '4321'
const cwd = appDir('companion')
const env = { ...process.env, ...COMPANION_ENV, NODE_ENV: 'production' }

// postbuild's headers.json, kept as built; headers.json is rewritten from it on every start.
const BUILT_HEADERS = join(SYNC_DIST, 'headers.postbuild.json')

if (process.env.E2E_BUILD === '1' || !existsSync(BUILT_HEADERS)) {
  const vite = spawnSync('bunx', ['vite', 'build', '--outDir', SYNC_DIST, '--emptyOutDir'], {
    cwd,
    env,
    stdio: 'inherit',
  })
  if (vite.status !== 0) throw new Error('companion (emulator build): vite build failed')
  const { postbuild } = await import(join(cwd, 'scripts', 'postbuild.ts'))
  postbuild({ dist: SYNC_DIST, env })
  renameSync(join(SYNC_DIST, 'headers.json'), BUILT_HEADERS)
}
allowEmulators()

/**
 * postbuild's CSP lists only the production Firebase hosts (googleapis.com and
 * https://<authDomain>); an emulator build talks to http://127.0.0.1:9099/8080
 * instead. Widen connect-src and frame-src in this copy's headers.json only.
 */
function allowEmulators(): void {
  const map = JSON.parse(readFileSync(BUILT_HEADERS, 'utf8')) as HeaderMap
  const widen = (policy: string): string =>
    policy
      .replace(/connect-src ([^;]*)/, `connect-src $1 ${AUTH_URL} ${FIRESTORE_URL}`)
      .replace(/frame-src ([^;]*)/, `frame-src $1 ${AUTH_URL}`)
  map.fallback = widen(map.fallback)
  for (const path of Object.keys(map.pages)) map.pages[path] = widen(map.pages[path] as string)
  // The COOP header is served exactly as shipped: postbuild relaxes it to
  // `same-origin-allow-popups` for sign-in builds, and this suite is what
  // proves the popup can still hand its result back.
  if (map.headers?.['Cross-Origin-Opener-Policy'] !== 'same-origin-allow-popups') {
    throw new Error('the built companion must ship COOP same-origin-allow-popups for sign-in')
  }
  writeFileSync(join(SYNC_DIST, 'headers.json'), `${JSON.stringify(map, null, 2)}\n`)
}

process.env.PORT = port
const { preview } = await import(join(cwd, 'scripts', 'serve.ts'))
preview(SYNC_DIST)
