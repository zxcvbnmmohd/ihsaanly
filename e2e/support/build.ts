// Production builds of the web apps for the e2e suites: the same steps as the
// app's `build` script, minus its post-build `bun test ./test` suite (that
// app's own check). A build is redone when its output is missing, when
// E2E_BUILD=1, or when a source file (the app's, or any packages/*/src) is
// newer than it.
//
//   marketing        apps/marketing/dist            (its serve.ts reads dist/headers.json)
//   companion        e2e/.builds/companion          local-only: no cloud env, no Account row
//   companion-cloud  e2e/.builds/companion-cloud    placeholder VITE_FIREBASE_* values: the
//                                                   Account row and the onboarding restore link
//   extension        apps/extension/dist
//
// Every build is VITE_APP_ENV=production. The companion builds go to their own
// folders so the env files in apps/companion (real Firebase projects) never
// leak into them and apps/companion/dist stays the developer's.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(import.meta.dirname, '..', '..')
const BUILDS = join(import.meta.dirname, '..', '.builds')

export type App = 'marketing' | 'companion' | 'extension'
export type Build = App | 'companion-cloud'

const NO_CLOUD = {
  VITE_FIREBASE_API_KEY: '',
  VITE_FIREBASE_AUTH_DOMAIN: '',
  VITE_FIREBASE_PROJECT_ID: '',
  VITE_FIREBASE_APP_ID: '',
  VITE_FIREBASE_EMULATOR_HOST: '',
  VITE_GOOGLE_OAUTH_CLIENT_ID: '',
}

/** Placeholder cloud config: enough for the app to show its cloud UI, never a real project. */
export const DUMMY_CLOUD = {
  VITE_FIREBASE_API_KEY: 'e2e-dummy-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'e2e-dummy.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'e2e-dummy',
  VITE_FIREBASE_APP_ID: '1:1:web:e2edummy',
  VITE_FIREBASE_EMULATOR_HOST: '',
  VITE_GOOGLE_OAUTH_CLIENT_ID: 'e2e-dummy.apps.googleusercontent.com',
}

/**
 * Where the companion builds look for content updates: production's origin,
 * which their CSP allows. Nothing reaches it: the companion fixture answers
 * every request there, and content-updates.spec.ts serves its own bundles.
 */
export const E2E_CONTENT_URL = 'https://ihsaanly.app/content'

interface BuildSpec {
  app: App
  /** The built site (what the server serves). */
  dist: string
  /** A file the build writes last-ish: missing means not built. */
  marker: string
  env: Record<string, string>
  steps: (dist: string) => string[][]
}

const companionSteps = (dist: string): string[][] => [
  ['bunx', 'vite', 'build', '--outDir', dist, '--emptyOutDir'],
  [
    'bun',
    '-e',
    `const { postbuild } = await import('./scripts/postbuild.ts'); postbuild({ dist: ${JSON.stringify(dist)} })`,
  ],
]

const SPECS: Record<Build, BuildSpec> = {
  marketing: {
    app: 'marketing',
    dist: join(REPO, 'apps', 'marketing', 'dist'),
    marker: 'headers.json',
    env: { VITE_APP_ENV: 'production' },
    steps: () => [
      ['bunx', 'vite', 'build'],
      ['bun', 'scripts/postbuild.ts'],
    ],
  },
  companion: {
    app: 'companion',
    dist: join(BUILDS, 'companion'),
    marker: 'headers.json',
    env: { ...NO_CLOUD, VITE_APP_ENV: 'production', VITE_CONTENT_URL: E2E_CONTENT_URL },
    steps: companionSteps,
  },
  'companion-cloud': {
    app: 'companion',
    dist: join(BUILDS, 'companion-cloud'),
    marker: 'headers.json',
    env: { ...DUMMY_CLOUD, VITE_APP_ENV: 'production', VITE_CONTENT_URL: E2E_CONTENT_URL },
    steps: companionSteps,
  },
  extension: {
    app: 'extension',
    dist: join(REPO, 'apps', 'extension', 'dist'),
    marker: 'manifest.json',
    // No content checks: the extension suites never reach the network.
    env: { VITE_APP_ENV: 'production', VITE_CONTENT_URL: '' },
    steps: () => [['bunx', 'vite', 'build']],
  },
}

export function appDir(app: App): string {
  return join(REPO, 'apps', app)
}

/** Where a build's output lives (the root its server serves). */
export function buildOutput(build: Build): string {
  return SPECS[build].dist
}

function newest(dir: string): number {
  if (!existsSync(dir)) return 0
  let latest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    if (entry.name === 'routeTree.gen.ts') continue // the build itself rewrites it
    const path = join(dir, entry.name)
    latest = Math.max(latest, entry.isDirectory() ? newest(path) : statSync(path).mtimeMs)
  }
  return latest
}

function stale({ app, dist, marker }: BuildSpec): boolean {
  const file = join(dist, marker)
  if (process.env.E2E_BUILD === '1' || !existsSync(file)) return true
  const builtAt = statSync(file).mtimeMs
  const appRoot = appDir(app)
  const sources = [join(appRoot, 'src'), join(appRoot, 'scripts'), join(appRoot, 'public')]
  const packages = join(REPO, 'packages')
  for (const pkg of readdirSync(packages)) sources.push(join(packages, pkg, 'src'))
  return sources.some((dir) => newest(dir) > builtAt)
}

const pause = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** One build of an app at a time (companion and companion-cloud share apps/companion/src). */
function withLock(app: App, run: () => void): void {
  mkdirSync(BUILDS, { recursive: true })
  // Build output and saved test state, never committed.
  if (!existsSync(join(BUILDS, '.gitignore'))) writeFileSync(join(BUILDS, '.gitignore'), '*\n')
  const lock = join(BUILDS, `.lock-${app}`)
  const deadline = Date.now() + 10 * 60_000
  for (;;) {
    try {
      mkdirSync(lock)
      break
    } catch {
      // A lock older than the longest build is left over from a killed run.
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 10 * 60_000) rmdirSync(lock)
      if (Date.now() > deadline) throw new Error(`${app}: timed out waiting for ${lock}`)
      pause(500)
    }
  }
  try {
    run()
  } finally {
    rmdirSync(lock)
  }
}

const built = new Set<Build>()

/** Builds `build` if it is missing or stale; returns its output directory. */
export function ensureBuilt(build: Build): string {
  const spec = SPECS[build]
  if (built.has(build)) return spec.dist
  built.add(build)
  withLock(spec.app, () => {
    if (!stale(spec)) return
    for (const [command, ...args] of spec.steps(spec.dist)) {
      // node:child_process, not Bun.spawn: Playwright's fixtures run under Node.
      const result = spawnSync(command as string, args, {
        cwd: appDir(spec.app),
        env: { ...process.env, ...spec.env, NODE_ENV: 'production' },
        stdio: 'inherit',
      })
      if (result.status !== 0) throw new Error(`${build}: ${[command, ...args].join(' ')} failed`)
    }
  })
  return spec.dist
}
