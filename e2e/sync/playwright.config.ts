// Cross-device sync against the Firebase emulators (docs/TESTING.md):
// `bun run e2e:sync`. Separate from the root config because it needs Java 21
// and its own servers:
//
//   1. the Auth + Firestore emulators, project demo-ihsaanly, with the real
//      packages/cloud/firestore.rules (support/emulators.ts);
//   2. the companion built against them (VITE_FIREBASE_EMULATOR_HOST) into a
//      temp outDir, never apps/companion/dist (support/serve.ts).
//
// Each test empties both emulators first, and every device is its own browser
// context, so tests share nothing but the servers — they still run one at a
// time, since they share the emulators.
import { defineConfig, devices } from '@playwright/test'
import { AUTH_URL, COMPANION_PORT } from './support/env.ts'

export default defineConfig({
  testDir: '.',
  // Its own folder: the root config's is e2e/.results/web, and Playwright empties an outputDir on start.
  outputDir: '../.results/sync',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: '../.report/sync' }]]
    : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${COMPANION_PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'bun e2e/sync/support/emulators.ts',
      cwd: '../..',
      // The Auth emulator answers once firebase-tools reports every emulator ready.
      url: `${AUTH_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // firebase-tools starts Java in its own process group, so the default
      // SIGKILL to the group would orphan it (and hold :8080). SIGTERM lets
      // firebase-tools stop its emulators itself.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
    },
    {
      command: `bun e2e/sync/support/serve.ts ${COMPANION_PORT}`,
      cwd: '../..',
      url: `http://localhost:${COMPANION_PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
})
