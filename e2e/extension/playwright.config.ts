// Extension e2e: `bun run e2e:extension`. Each test launches its own persistent
// Chromium context with an unpacked build (see builds.ts / fixtures.ts).
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../.results/extension',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  // Builds happen once up front, so parallel workers never race on a build.
  globalSetup: './global-setup.ts',
})
