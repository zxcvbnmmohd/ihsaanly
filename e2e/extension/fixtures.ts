// Per-test persistent Chromium context with an unpacked build, plus helpers.
// Default flavour is "local"; override per file with test.use({ flavour: 'cloud' }).
import {
  type BrowserContext,
  test as base,
  chromium,
  type Page,
  type Worker,
} from '@playwright/test'
import { collectErrors } from '../support/console.ts'
import { ensureBuilt, type Flavour } from './builds.ts'

interface Fixtures {
  flavour: Flavour
  context: BrowserContext
  worker: Worker
  extensionId: string
  /** Opens popup.html (optionally at a hash route) in a fresh tab; returns the page and its collected errors. */
  openPopup: (route?: string) => Promise<{ page: Page; errors: string[] }>
}

export const test = base.extend<Fixtures>({
  flavour: ['local', { option: true }],
  context: async ({ flavour }, use) => {
    const dist = ensureBuilt(flavour)
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    })
    // Fixed locale/time so "today" renders deterministically enough.
    await use(context)
    await context.close()
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
    await use(worker)
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host)
  },
  openPopup: async ({ context, extensionId }, use) => {
    await use(async (route = '/') => {
      const page = await context.newPage()
      const errors = collectErrors(page)
      await page.goto(`chrome-extension://${extensionId}/popup.html#${route}`)
      return { page, errors }
    })
  },
})

export { expect } from '@playwright/test'
