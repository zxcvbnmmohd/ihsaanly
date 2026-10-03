// Three unpacked builds of apps/extension, cached under e2e/extension/.builds:
//   local  production, no cloud env (Account row hidden)
//   cloud  production, dummy cloud env (Account row shown)
//   beta   `package:beta` flavour (manifest "Ihsaanly Beta" + Beta pill), no cloud env
// A build is redone when missing, when E2E_BUILD=1, or when a source file is newer than it.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(import.meta.dirname, '..', '..')
const APP = join(REPO, 'apps', 'extension')
export const BUILDS_DIR = join(import.meta.dirname, '.builds')

export type Flavour = 'local' | 'cloud' | 'beta'

const NO_CLOUD = {
  VITE_FIREBASE_API_KEY: '',
  VITE_FIREBASE_AUTH_DOMAIN: '',
  VITE_FIREBASE_PROJECT_ID: '',
  VITE_FIREBASE_APP_ID: '',
  VITE_FIREBASE_EMULATOR_HOST: '',
  VITE_GOOGLE_OAUTH_CLIENT_ID: '',
}
const DUMMY_CLOUD = {
  VITE_FIREBASE_API_KEY: 'dummy-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'dummy.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'dummy-project',
  VITE_FIREBASE_APP_ID: '1:1:web:dummy',
  VITE_FIREBASE_EMULATOR_HOST: '',
  VITE_GOOGLE_OAUTH_CLIENT_ID: 'dummy.apps.googleusercontent.com',
}

// VITE_CONTENT_URL empty: no content update checks, so the suites never reach the network.
const CONFIG: Record<Flavour, { args: string[]; env: Record<string, string> }> = {
  local: { args: [], env: { ...NO_CLOUD, VITE_APP_ENV: 'production', VITE_CONTENT_URL: '' } },
  cloud: { args: [], env: { ...DUMMY_CLOUD, VITE_APP_ENV: 'production', VITE_CONTENT_URL: '' } },
  beta: {
    args: ['--mode', 'development'],
    env: { ...NO_CLOUD, VITE_APP_ENV: 'development', VITE_CONTENT_URL: '' },
  },
}

export interface Manifest {
  manifest_version: number
  name: string
  version: string
  permissions: string[]
  icons: Record<string, string>
  action: { default_popup: string; default_title?: string }
  background: { service_worker: string; type: string }
  commands: Record<string, { suggested_key: { default: string } }>
}

export function readManifest(flavour: Flavour): Manifest {
  return JSON.parse(readFileSync(join(distDir(flavour), 'manifest.json'), 'utf8'))
}

export function distDir(flavour: Flavour): string {
  return join(BUILDS_DIR, flavour)
}

function newestSource(dir: string): number {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    newest = Math.max(newest, entry.isDirectory() ? newestSource(path) : statSync(path).mtimeMs)
  }
  return newest
}

function stale(flavour: Flavour): boolean {
  const manifest = join(distDir(flavour), 'manifest.json')
  if (process.env.E2E_BUILD === '1' || !existsSync(manifest)) return true
  const builtAt = statSync(manifest).mtimeMs
  return [join(APP, 'src'), join(REPO, 'packages')].some((dir) => {
    // packages/*/src only
    if (dir.endsWith('packages')) {
      return readdirSync(dir).some((pkg) => {
        const src = join(dir, pkg, 'src')
        return existsSync(src) && newestSource(src) > builtAt
      })
    }
    return newestSource(dir) > builtAt
  })
}

export function ensureBuilt(flavour: Flavour): string {
  if (stale(flavour)) {
    const { args, env } = CONFIG[flavour]
    const result = spawnSync(
      'bunx',
      ['vite', 'build', '--outDir', distDir(flavour), '--emptyOutDir', ...args],
      { cwd: APP, env: { ...process.env, ...env, NODE_ENV: 'production' }, stdio: 'inherit' },
    )
    if (result.status !== 0) throw new Error(`extension ${flavour} build failed`)
  }
  return distDir(flavour)
}
