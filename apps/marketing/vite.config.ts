import { rnWebConfig } from '@ihsaanly/web/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vite'
import { allPagePaths } from './src/i18n/locales.ts'

export default defineConfig(
  mergeConfig(rnWebConfig(), {
    server: { port: 3002 },
    resolve: {
      // Explicit, not tsconfigPaths: that would also apply packages' own tsconfigs
      // inside node_modules (expo-modules-core maps modules to type stubs).
      alias: [{ find: /^~\//, replacement: new URL('./src/', import.meta.url).pathname }],
    },
    plugins: [
      tailwindcss(),
      // The host is static (GoDaddy shared hosting), so every page is rendered
      // once here. Turning `prerender` off and deploying dist/server to a Node
      // host keeps the same routes, loaders and server functions working at
      // request time.
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
  }),
)
