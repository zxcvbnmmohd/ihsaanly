// Web end-to-end suites (docs/TESTING.md): `bun run e2e:web`, or one project
// with `--project companion`. Each project runs against a production build
// (VITE_APP_ENV=production), served the way the Apache host serves it; a
// missing or stale build is made first (E2E_BUILD=1 rebuilds every time).
//
// Projects: marketing and companion at desktop size (1280×800), and the same
// suites again as marketing-mobile and companion-mobile (375×812, touch).
// The extension and cross-device sync suites have their own configs
// (e2e/extension, e2e/sync); `bun run e2e` runs all of them.
import { defineConfig, devices } from '@playwright/test'
import { TIMEZONE } from './e2e/support/clock.ts'
import {
  COMPANION_CLOUD_PORT,
  COMPANION_CLOUD_URL,
  COMPANION_PORT,
  COMPANION_URL,
  MARKETING_PORT,
  MARKETING_URL,
} from './e2e/support/ports.ts'

const CI = !!process.env.CI

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
const mobile = {
  ...devices['Desktop Chrome'],
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}

interface WebServer {
  command: string
  url: string
  reuseExistingServer: boolean
  timeout: number
  stdout: 'ignore'
  stderr: 'pipe'
}

const server = (build: string, port: number, url: string): WebServer => ({
  command: `bun e2e/support/serve.ts ${build} ${port}`,
  url: `${url}/`,
  reuseExistingServer: !CI,
  // Covers a cold production build on a slow runner.
  timeout: 300_000,
  stdout: 'ignore',
  stderr: 'pipe',
})

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['extension/**', 'sync/**', 'mobile/**'],
  // Its own folder: Playwright empties outputDir on start, and the extension
  // and sync configs write theirs under e2e/.results too.
  outputDir: './e2e/.results/web',
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: [[CI ? 'github' : 'list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  use: {
    locale: 'en-GB',
    timezoneId: TIMEZONE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'marketing',
      testDir: './e2e/marketing',
      use: { ...desktop, baseURL: MARKETING_URL },
    },
    {
      name: 'marketing-mobile',
      testDir: './e2e/marketing',
      use: { ...mobile, baseURL: MARKETING_URL },
    },
    {
      name: 'companion',
      testDir: './e2e/companion',
      use: { ...desktop, baseURL: COMPANION_URL },
    },
    {
      name: 'companion-mobile',
      testDir: './e2e/companion',
      use: { ...mobile, baseURL: COMPANION_URL },
    },
  ],
  webServer: [
    server('marketing', MARKETING_PORT, MARKETING_URL),
    server('companion', COMPANION_PORT, COMPANION_URL),
    server('companion-cloud', COMPANION_CLOUD_PORT, COMPANION_CLOUD_URL),
  ],
})
