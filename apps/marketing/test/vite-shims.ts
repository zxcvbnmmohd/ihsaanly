// What Vite does at build time and Bun does not: `import.meta.glob` (eager)
// and `?url` imports, plus the server-function stand-in (./server-fn). Loaded
// after the shared component preload (bunfig.toml), so every test file sees
// them whichever loads the app's modules first.
import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { plugin } from 'bun'
import './server-fn'

declare global {
  var __viteGlob: (pattern: string, from: string) => Record<string, { default: unknown }>
}

globalThis.__viteGlob = (pattern, from) => {
  const found: Record<string, { default: unknown }> = {}
  const base = join(from, pattern.replace(/\/[^/]*$/, ''))
  const name = pattern.slice(pattern.lastIndexOf('/') + 1)
  for (const file of new Bun.Glob(name).scanSync({ cwd: base, absolute: true })) {
    const key = `${pattern.slice(0, pattern.lastIndexOf('/') + 1)}${relative(base, file)}`
    found[key] = { default: JSON.parse(readFileSync(file, 'utf8')) }
  }
  return found
}

const GLOB = /import\.meta\.glob<[^>]*>\(\s*('[^']+')\s*,\s*\{\s*eager:\s*true,?\s*\}\s*,?\s*\)/g

plugin({
  name: 'ihsaanly:marketing-vite',
  setup(build) {
    build.onLoad(
      { filter: /\/src\/(?:i18n\/messages|content\/specimen)\.server\.ts$/ },
      async ({ path }) => {
        const source = await Bun.file(path).text()
        const contents = source.replace(
          GLOB,
          (whole, pattern: string) =>
            `__viteGlob(${pattern}, ${JSON.stringify(dirname(path))})${'\n'.repeat(whole.split('\n').length - 1)}`,
        )
        return { contents, loader: 'ts' }
      },
    )
    build.onResolve({ filter: /\?url$/ }, ({ path }) => ({ path, namespace: 'vite-url' }))
    build.onLoad({ filter: /.*/, namespace: 'vite-url' }, ({ path }) => ({
      exports: { default: `/${path.replace(/^.*\//, '').replace(/\?url$/, '')}` },
      loader: 'object',
    }))
  },
})
