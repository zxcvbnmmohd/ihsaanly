// The document head per route: each page names itself in the tab title, and
// only the door (/) and the first onboarding step may be indexed.
import { en } from '@ihsaanly/core/strings/en'
import { ONBOARDED_STATE } from '../support/global-setup.ts'
import { expect, test } from './fixtures.ts'

const DEFAULT_TITLE = /^Ihsaanly · /
const noindex = 'meta[name="robots"][content*="noindex"]'

test('the door and the welcome step are indexable', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await expect(page).toHaveTitle(DEFAULT_TITLE)
  await expect(page.locator(noindex)).toHaveCount(0)

  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await expect(page).toHaveURL(/\/onboarding\/how$/)
  await expect(page.locator(noindex)).toHaveCount(1)
  await page.getByRole('button', { name: en.onboarding.back }).click()
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await expect(page.locator(noindex)).toHaveCount(0)
})

test.describe('in the app', () => {
  test.use({ storageState: ONBOARDED_STATE })

  const ROUTES = [
    { path: '/today', title: en.today.title },
    { path: '/library', title: en.library.title },
    { path: '/glossary', title: en.glossary.title },
    { path: '/item/dua-sleeping', title: 'Going to sleep' },
    { path: '/item/memorise/dua-sleeping', title: en.memorise.title },
    { path: '/history', title: en.history.title },
    { path: '/data', title: en.data.title },
    { path: '/about', title: en.about.title },
    { path: '/diagnostics', title: en.diagnostics.title },
    { path: '/no-such-screen', title: en.notFound.title },
  ]

  for (const { path, title } of ROUTES) {
    test(`${path}: "${title} · Ihsaanly", noindex`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveTitle(`${title} · Ihsaanly`)
      await expect(page.locator(noindex)).toHaveCount(1)
    })
  }

  test('the title follows client-side navigation', async ({ page }) => {
    await page.goto('/today')
    await expect(page).toHaveTitle(`${en.today.title} · Ihsaanly`)
    await page.getByRole('navigation').getByRole('link', { name: en.library.title }).first().click()
    await expect(page).toHaveTitle(`${en.library.title} · Ihsaanly`)
    await page.goBack()
    await expect(page).toHaveTitle(`${en.today.title} · Ihsaanly`)
  })
})
