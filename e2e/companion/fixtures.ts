// The companion's test fixture: every page runs at FIXED_NOW (so the part of
// the day, and which prayers can be marked, never depend on the wall clock),
// cannot reach Firebase (the cloud build's placeholder project does not
// exist) or the content host, and reports its console errors in `errors`.
//
// `onboarded` tests start with the storage global-setup.ts saved after one
// walk through onboarding, so they open straight on Today.
import { test as base, expect } from '@playwright/test'
import { E2E_CONTENT_URL } from '../support/build.ts'
import { FIXED_NOW } from '../support/clock.ts'
import { collectErrors } from '../support/console.ts'
import { ONBOARDED_STATE } from '../support/global-setup.ts'

interface Fixtures {
  errors: string[]
}

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    await context.route(
      /^https:\/\/[^/]*(googleapis\.com|firebaseapp\.com|gstatic\.com)\//,
      (route) => route.abort('blockedbyclient'),
    )
    // The content update check: answered with a manifest no build understands,
    // so every app keeps the content it shipped with, quietly.
    // content-updates.spec.ts registers its own server over this one.
    await context.route(`${E2E_CONTENT_URL}/**`, (route) =>
      route.fulfill({
        json: { schemaVersion: 0 },
        headers: { 'access-control-allow-origin': '*' },
      }),
    )
    await use(context)
  },
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_NOW)
    await use(page)
  },
  errors: async ({ page }, use) => {
    await use(collectErrors(page))
  },
})

/** Starts each test of the file on Today, onboarded in London. */
export function useOnboarded(): void {
  test.use({ storageState: ONBOARDED_STATE })
}

export { expect }
