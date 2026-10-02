import type { Plugin, UserConfig } from 'vite'
import { resolveAppEnv } from './app-env.ts'

// React Native on the web, the way NativeWind's Metro resolver does it: app
// code importing `react-native` gets react-native-css's className-aware
// components, and those components get react-native-web underneath.
export function reactNativeWeb(): Plugin {
  return {
    name: 'ihsaanly:react-native-web',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (source === 'react-native/asset-registry') {
        return this.resolve('react-native-web/dist/modules/AssetRegistry', importer, {
          ...options,
          skipSelf: true,
        })
      }
      if (source !== 'react-native') return null
      const fromCss = importer?.includes('/react-native-css/') ?? false
      return this.resolve(fromCss ? 'react-native-web' : 'react-native-css/components', importer, {
        ...options,
        skipSelf: true,
      })
    },
    // Metro turns `require('./x.png')` into an asset; on the web it is the file's URL.
    // A bare `require('pkg')` (a lazy load on native, e.g. city-timezones in
    // core) becomes a hoisted import: the browser has no `require`, and the
    // production bundle inlines the package eagerly all the same.
    transform(code, id) {
      if (id.includes('/node_modules/') || !/\.(tsx?|jsx?)$/.test(id) || !code.includes('require('))
        return null
      let n = 0
      const imports: string[] = []
      const out = code
        .replace(/require\('([^']+\.(?:png|jpe?g|gif|svg))'\)/g, (_, path: string) => {
          const name = `__asset${n++}`
          imports.push(`import ${name} from '${path}?url'`)
          return `{ uri: ${name} }`
        })
        .replace(/require\('([^'./][^']*)'\)/g, (_, pkg: string) => {
          const name = `__require${n++}`
          imports.push(`import ${name} from '${pkg}'`)
          return name
        })
      return n ? { code: `${imports.join('\n')}\n${out}`, map: null } : null
    },
  }
}

/**
 * Replaces `import.meta.env.VITE_APP_ENV` with a literal in every bundle
 * (client and SSR), so `isDevelopmentBuild` (./app-env.ts) folds to a
 * constant and a production bundle carries none of the development markers.
 * Unset, it is development under `vite dev` or `--mode development`.
 */
function appEnvDefine(): Plugin {
  return {
    name: 'ihsaanly:app-env',
    config(_config, { command, mode }) {
      const env = resolveAppEnv(
        process.env.VITE_APP_ENV,
        command === 'serve' || mode === 'development',
      )
      return { define: { 'import.meta.env.VITE_APP_ENV': JSON.stringify(env) } }
    },
  }
}

/** react-native-web resolution: a package's .web file wins over its native one. */
export const WEB_EXTENSIONS = [
  '.web.tsx',
  '.web.ts',
  '.web.js',
  '.tsx',
  '.ts',
  '.mjs',
  '.js',
  '.jsx',
  '.json',
]

/**
 * The Vite config every react-native-web host shares: the resolution shim
 * above, Expo's `__DEV__`/`process.env.EXPO_OS` defines, and the
 * shimMissingExports build/optimizeDeps settings Expo's compiled
 * type-declaration modules need. A host merges this with its own
 * `server`/`resolve.alias`/plugins via `mergeConfig(rnWebConfig(), {...})`.
 */
export function rnWebConfig(): UserConfig {
  return {
    define: {
      __DEV__: 'false',
      'process.env.EXPO_OS': JSON.stringify('web'),
      global: 'globalThis',
    },
    // Expo's compiled type-declaration modules import names they never export;
    // Metro ignores that, Rolldown needs telling.
    build: {
      rolldownOptions: {
        shimMissingExports: true,
        // Two direct `eval`s inside Expo that never run on the web: a
        // `require('node:crypto')` fallback for runtimes without
        // `crypto.randomUUID`, and the dev server's async-require loader.
        // Only those are hushed, so an `eval` anywhere else still warns (and
        // an extension's CSP would refuse it at runtime).
        onLog(level, log, handler) {
          if (log.code === 'EVAL' && /node_modules\/expo(-modules-core)?\//.test(log.id ?? ''))
            return
          handler(level, log)
        },
      },
    },
    // The dev server pre-bundles dependencies without the app's plugins, so the
    // optimizer needs the same React Native resolution and missing-export shim.
    optimizeDeps: {
      // Only reached through a `require` the plugin above rewrites, which the
      // dependency scan never sees: found late, it re-optimizes mid-session and
      // the page ends up with two copies of React ("Invalid hook call").
      include: ['city-timezones'],
      rolldownOptions: {
        plugins: [reactNativeWeb()],
        shimMissingExports: true,
        resolve: { extensions: WEB_EXTENSIONS },
        transform: {
          define: {
            __DEV__: 'true',
            'process.env.EXPO_OS': JSON.stringify('web'),
            global: 'globalThis',
          },
        },
      },
    },
    resolve: {
      // Explicit, not tsconfigPaths: that would also apply packages' own tsconfigs
      // inside node_modules (expo-modules-core maps modules to type stubs).
      extensions: WEB_EXTENSIONS,
    },
    plugins: [reactNativeWeb(), appEnvDefine()],
  }
}
