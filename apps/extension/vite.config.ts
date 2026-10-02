import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveAppEnv } from '@ihsaanly/web/app-env'
import { THEME_SCRIPT } from '@ihsaanly/web/theme'
import { rnWebConfig } from '@ihsaanly/web/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, mergeConfig, type Plugin } from 'vite'

/**
 * Manifest V3's CSP allows no inline script, so the companion's inlined
 * pre-paint theme script ships here as its own file, which popup.html loads.
 */
function themeScript(): Plugin {
  return {
    name: 'ihsaanly:theme-script',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'theme.js', source: THEME_SCRIPT })
    },
  }
}

/**
 * A beta (development) build is named "Ihsaanly Beta" in Chrome's toolbar
 * and extensions page, so it can sit next to the store build without being
 * confused with it. public/manifest.json stays the production manifest: only
 * the copy in dist is stamped, and the version is never touched.
 */
function betaManifest(): Plugin {
  let outDir = 'dist'
  let beta = false
  return {
    name: 'ihsaanly:beta-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      beta =
        resolveAppEnv(process.env.VITE_APP_ENV, config.mode === 'development') === 'development'
    },
    writeBundle() {
      if (!beta) return
      const file = join(outDir, 'manifest.json')
      const manifest = JSON.parse(readFileSync(file, 'utf8'))
      manifest.name = 'Ihsaanly Beta'
      manifest.action = { ...manifest.action, default_title: 'Ihsaanly Beta' }
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  }
}

export default defineConfig(
  mergeConfig(rnWebConfig(), {
    resolve: {
      alias: [{ find: /^~\//, replacement: new URL('./src/', import.meta.url).pathname }],
    },
    build: {
      // Loaded unpacked while iterating; a map per chunk costs nothing there.
      sourcemap: true,
      // The popup loads from the extension package on disk, not the network,
      // so the web-oriented 500 kB warning does not apply.
      // ponytail: one ~3 MB popup chunk; split content by locale if popup open time suffers.
      chunkSizeWarningLimit: 4000,
      rolldownOptions: {
        input: { popup: 'popup.html', background: 'src/background.ts' },
        // The manifest names the service worker by a fixed path.
        output: {
          entryFileNames: (chunk: { name: string }) =>
            chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        },
      },
    },
    // The router plugin generates src/routeTree.gen.ts and must precede React's.
    plugins: [
      themeScript(),
      betaManifest(),
      tailwindcss(),
      tanstackRouter({ target: 'react' }),
      viteReact(),
    ],
  }),
)
