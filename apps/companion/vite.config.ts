import { smartBannerContent } from '@ihsaanly/web/app-links'
import { THEME_COLOR, THEME_SCRIPT } from '@ihsaanly/web/theme'
import { rnWebConfig } from '@ihsaanly/web/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, mergeConfig, type Plugin } from 'vite'

/**
 * `index.html` stays a plain static file; the pieces that depend on shared
 * config (the pre-paint script, whose hash the CSP must match exactly, and
 * the iOS Smart App Banner meta, dormant while there is no App Store id) are
 * injected here rather than duplicated by hand.
 */
function injectHead(): Plugin {
  return {
    name: 'ihsaanly:inject-head',
    transformIndexHtml(html) {
      const banner = smartBannerContent('/')
      return html
        .replace('<!--theme-script-->', `<script>${THEME_SCRIPT}</script>`)
        .replace(
          '<!--apple-itunes-app-->',
          banner ? `<meta name="apple-itunes-app" content="${banner}" />` : '',
        )
        .replaceAll('#f7f0e9', THEME_COLOR.light)
        .replaceAll('#1b1411', THEME_COLOR.dark)
    },
  }
}

export default defineConfig(
  mergeConfig(rnWebConfig(), {
    server: { port: 3003 },
    resolve: {
      // Explicit, not tsconfigPaths: that would also apply packages' own tsconfigs
      // inside node_modules (expo-modules-core maps modules to type stubs).
      alias: [{ find: /^~\//, replacement: new URL('./src/', import.meta.url).pathname }],
    },
    plugins: [
      injectHead(),
      tailwindcss(),
      // Generates src/routeTree.gen.ts from the file tree in src/routes. Must
      // come before React's plugin, which then compiles the generated file.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      viteReact(),
    ],
  }),
)
