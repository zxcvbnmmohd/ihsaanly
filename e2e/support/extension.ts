// Loads apps/extension/dist as an unpacked MV3 extension in a persistent
// Chromium context, the pattern from https://playwright.dev/docs/chrome-extensions.
// Extensions need Playwright's bundled Chromium (channel "chromium"), which
// runs them headless too.
import { join } from 'node:path'
import { type BrowserContext, test as base, chromium } from '@playwright/test'
import { appDir, ensureBuilt } from './build.ts'

interface ExtensionFixtures {
  context: BrowserContext
  extensionId: string
}

export const test = base.extend<ExtensionFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads the fixture's dependencies from this pattern.
  context: async ({}, use) => {
    ensureBuilt('extension')
    const extension = join(appDir('extension'), 'dist')
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    const [worker] = context.serviceWorkers()
    const background = worker ?? (await context.waitForEvent('serviceworker'))
    await use(new URL(background.url()).host)
  },
})

export { expect } from '@playwright/test'
