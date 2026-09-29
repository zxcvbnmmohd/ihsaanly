import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { allPagePaths } from './src/i18n/locales.ts'

// React Native on the web, the way NativeWind's Metro resolver does it: app
// code importing `react-native` gets react-native-css's className-aware
// components, and those components get react-native-web underneath.
function reactNativeWeb(): Plugin {
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
    transform(code, id) {
      if (id.includes('/node_modules/') || !/\.(tsx?|jsx?)$/.test(id) || !code.includes('require('))
        return null
      let n = 0
      const imports: string[] = []
      const out = code.replace(
        /require\('([^']+\.(?:png|jpe?g|gif|svg))'\)/g,
        (_, path: string) => {
          const name = `__asset${n++}`
          imports.push(`import ${name} from '${path}?url'`)
          return `{ uri: ${name} }`
        },
      )
      return n ? { code: `${imports.join('\n')}\n${out}`, map: null } : null
    },
  }
}

// The host is static (GoDaddy shared hosting), so every page is rendered once
// here. Turning `prerender` off and deploying dist/server to a Node host keeps
// the same routes, loaders and server functions working at request time.
/** react-native-web resolution: a package's .web file wins over its native one. */
const WEB_EXTENSIONS = [
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

export default defineConfig({
  server: { port: 3002 },
  define: { __DEV__: 'false', 'process.env.EXPO_OS': JSON.stringify('web'), global: 'globalThis' },
  // Expo's compiled type-declaration modules import names they never export;
  // Metro ignores that, Rolldown needs telling.
  build: { rolldownOptions: { shimMissingExports: true } },
  // The dev server pre-bundles dependencies without the app's plugins, so the
  // optimizer needs the same React Native resolution and missing-export shim.
  optimizeDeps: {
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
    alias: [{ find: /^~\//, replacement: new URL('./src/', import.meta.url).pathname }],
  },
  plugins: [
    reactNativeWeb(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        // In-page anchors like /#questions are the same file; crawling them re-renders it.
        filter: ({ path }) => !path.includes('#'),
        crawlLinks: true,
        failOnError: true,
        autoSubfolderIndex: true,
      },
      pages: [
        ...allPagePaths().map((path) => ({ path })),
        { path: '/404/', prerender: { enabled: true, outputPath: '/404.html' } },
      ],
    }),
    // React's plugin must come after Start's.
    viteReact(),
  ],
})
