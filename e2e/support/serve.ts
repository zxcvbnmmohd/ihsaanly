// Playwright's webServer for a static app: builds it if needed, then serves
// its dist the way the Apache host will (the app's own scripts/serve.ts).
//
//   bun e2e/support/serve.ts <marketing|companion|companion-cloud> <port>
//
// `companion-cloud` is the companion built with placeholder VITE_FIREBASE_*
// values (build.ts), for the journeys that only exist when cloud sync does.
import { join } from 'node:path'
import { appDir, type Build, buildOutput, ensureBuilt } from './build.ts'

const [build, port] = process.argv.slice(2) as [Build, string]
process.env.PORT = port

if (build === 'marketing') {
  ensureBuilt('marketing')
  const { start } = (await import(join(appDir('marketing'), 'scripts', 'serve.ts'))) as {
    start: (dist: string) => unknown
  }
  start(join(appDir('marketing'), 'dist'))
} else if (build === 'companion' || build === 'companion-cloud') {
  ensureBuilt(build)
  const { preview } = (await import(join(appDir('companion'), 'scripts', 'serve.ts'))) as {
    preview: (root?: string) => unknown
  }
  preview(buildOutput(build))
} else {
  throw new Error(`Cannot serve ${build}`)
}
