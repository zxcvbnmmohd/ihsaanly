// Component-test environment for every react-native-web host: a DOM
// (happy-dom), Expo's web globals, and the React Native resolution the Vite
// builds use (packages/web/src/vite.ts). A workspace opts in from its
// bunfig.toml:
//
//   [test]
//   preload = ["../../packages/ui/test/preload.ts"]
//
// Bun's runtime plugins do not see how ESM imports or bare specifiers
// resolve, so the Vite plugin's resolveId is rebuilt from what Bun does
// offer: onLoad, which sees every file it loads, and mock.module.

import { afterEach, expect, mock } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { plugin } from 'bun'

// The DOM, but Bun's own networking, streams, URL and crypto: a workspace's
// other tests (preview servers, headless Chrome, Firebase emulators) keep
// working, and native fetch never meets a happy-dom AbortSignal or Blob.
const NATIVE = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'Blob',
  'File',
  'WebSocket',
  'URL',
  'URLSearchParams',
  'AbortController',
  'AbortSignal',
  'TextEncoder',
  'TextDecoder',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'crypto',
] as const
const native = Object.fromEntries(
  NATIVE.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
)
GlobalRegistrator.register({ url: 'http://localhost/' })
for (const [key, descriptor] of Object.entries(native)) {
  if (descriptor) Object.defineProperty(globalThis, key, descriptor)
}

// Reanimated reads the reduced-motion setting once, when it loads. Tests ask
// for it so entering animations (which start `visibility: hidden` and need
// frames to finish) never hide the content a test is about to query.
const matchMedia = window.matchMedia.bind(window)
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => {
    const list = matchMedia(query)
    if (!query.includes('prefers-reduced-motion')) return list
    return Object.defineProperty(Object.create(list), 'matches', { value: true })
  },
})

// rnWebConfig()'s defines.
const g = globalThis as Record<string, unknown>
g.__DEV__ = false
g.global = globalThis
process.env.EXPO_OS = 'web'

/** react-native-web resolution: a `.web` file wins over its native one (WEB_EXTENSIONS). */
const WEB_VARIANTS = ['.web.tsx', '.web.ts', '.web.js']

function webVariant(path: string): string | undefined {
  const match = /^(.*)\.(?:tsx|ts|mjs|cjs|jsx|js)$/.exec(path)
  if (!match?.[1] || match[1].endsWith('.web')) return undefined
  return WEB_VARIANTS.map((ext) => `${match[1]}${ext}`).find((candidate) => existsSync(candidate))
}

const repo = `${import.meta.dir}/../../..`

// Workspace modules with a `.web` sibling (state's capabilities and storage
// backend, ui's surface/row/sign-in-button…). Loading the native file loads a
// re-export of the web one, so coverage is recorded against the web file.
const webSiblings = new Map<string, string>()
for (const web of new Bun.Glob('{apps,packages}/*/src/**/*.web.{ts,tsx}').scanSync({
  cwd: repo,
  absolute: true,
})) {
  if (/\.test\.|\/node_modules\//.test(web)) continue
  const nativeFile = web.replace(/\.web\.(tsx?)$/, '.$1')
  if (existsSync(nativeFile)) webSiblings.set(nativeFile, web)
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The React Native packages that ship ESM builds with platform files. Their
// `.web.js` sibling, when there is one, is loaded in place of the file (same
// folder, so its relative imports still resolve). The TypeScript loader drops
// imports used only as types, which is what Vite's shimMissingExports covers
// for Expo's compiled type-declaration modules.
const REACT_NATIVE_ESM =
  /\/node_modules\/(?:expo[^/]*|@expo\/[^/]+|react-native-(?:reanimated|worklets|safe-area-context|svg|gesture-handler|screens))\/(?:build|lib\/module|src)\/.*\.m?js$/

plugin({
  name: 'ihsaanly:react-native-web',
  setup(build) {
    if (webSiblings.size > 0) {
      const filter = new RegExp(`^(?:${[...webSiblings.keys()].map(escapeRegExp).join('|')})$`)
      build.onLoad({ filter }, ({ path }) => {
        const web = JSON.stringify(webSiblings.get(path))
        const source = readFileSync(webSiblings.get(path) as string, 'utf8')
        const hasDefault = /export default|export \{[^}]*\bdefault\b/.test(source)
        return {
          contents: `export * from ${web}\n${hasDefault ? `export { default } from ${web}\n` : ''}`,
          loader: 'ts',
        }
      })
    }

    // Metro turns `require('./x.png')` into an asset; the Vite builds into `{ uri }`.
    build.onLoad({ filter: /\.(?:png|jpe?g|gif|webp|svg)$/ }, ({ path }) => ({
      exports: { uri: path, default: { uri: path } },
      loader: 'object',
    }))

    build.onLoad({ filter: REACT_NATIVE_ESM }, ({ path }) => ({
      contents: readFileSync(webVariant(path) ?? path, 'utf8'),
      loader: 'tsx',
    }))
  },
})

// `react-native` is react-native-css's className-aware components over
// react-native-web, as in the Vite builds. App code gets it as a module mock;
// react-native-css's own CommonJS files are evaluated by the small loader
// below, which hands them react-native-web for `react-native` (through the
// mock they would wrap their own wrappers).
const load = createRequire(import.meta.url)
const rnWeb = load('react-native-web') as Record<string, unknown>
const cssRoot = dirname(load.resolve('react-native-css/package.json'))
const cssModules = new Map<string, { exports: unknown }>()

function loadCss(path: string): unknown {
  const cached = cssModules.get(path)
  if (cached) return cached.exports
  const module = { exports: {} as unknown }
  cssModules.set(path, module)
  const real = createRequire(path)
  const local = (specifier: string): unknown => {
    if (specifier === 'react-native') return rnWeb
    const target = real.resolve(specifier)
    return target.startsWith(cssRoot) && /\.c?js$/.test(target) ? loadCss(target) : real(specifier)
  }
  new Function(
    'require',
    'module',
    'exports',
    '__filename',
    '__dirname',
    readFileSync(path, 'utf8'),
  )(local, module, module.exports, path, dirname(path))
  return module.exports
}

const cssComponents = loadCss(load.resolve('react-native-css/components')) as Record<
  string,
  unknown
>
const reactNative: Record<string, unknown> = { ...rnWeb }
for (const key of Object.keys(cssComponents)) {
  const value = cssComponents[key]
  if (value !== undefined) reactNative[key] = value
}
mock.module('react-native', () => reactNative)
mock.module('react-native/asset-registry', () =>
  load('react-native-web/dist/modules/AssetRegistry'),
)

// Packages whose `main` is a CommonJS build Bun would load (its CommonJS
// requires bypass the plugin above): their ESM build (`module`) instead, so
// the `.web` files in it are picked.
for (const name of ['react-native-safe-area-context', 'react-native-svg', 'react-native-screens']) {
  let manifest: { main?: string; module?: string }
  try {
    manifest = load(`${name}/package.json`)
  } catch {
    continue
  }
  if (!manifest.module || manifest.module === manifest.main) continue
  const entry = `${dirname(load.resolve(`${name}/package.json`))}/${manifest.module}`
  mock.module(name, () => load(entry))
}

// Testing Library: jest-dom's matchers on Bun's expect (types: ./jest-dom.d.ts),
// and an unmount after every test. Imported only now, so react-dom and
// friends load after the DOM and the mocks above.
const matchers = await import('@testing-library/jest-dom/matchers')
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0])
const { cleanup } = await import('@testing-library/react')
afterEach(() => cleanup())
