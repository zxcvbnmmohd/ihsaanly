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

export default defineConfig(
  mergeConfig(rnWebConfig(), {
    resolve: {
      alias: [{ find: /^~\//, replacement: new URL('./src/', import.meta.url).pathname }],
    },
    build: {
      // Loaded unpacked while iterating; a map per chunk costs nothing there.
      sourcemap: true,
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
    plugins: [themeScript(), tailwindcss(), tanstackRouter({ target: 'react' }), viteReact()],
  }),
)
