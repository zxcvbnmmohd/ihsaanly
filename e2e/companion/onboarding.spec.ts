// A first run: the welcome step's language and appearance choices, every
// step after it (location by choosing a city: no permission asked), landing
// on Today, and a reload that keeps all of it (localStorage).
import { ar } from '@ihsaanly/core/strings/ar'
import { en } from '@ihsaanly/core/strings/en'
import { horizontalOverflow } from '../support/layout.ts'
import { expect, test } from './fixtures.ts'
import { onboardWithCity } from './onboard.ts'

test('a first visit lands on the onboarding welcome', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await expect(page.getByText(en.onboarding.welcomeTitle)).toBeVisible()
  // The local-only build has no cloud, so no restore link.
  await expect(page.getByRole('button', { name: en.onboarding.restore })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('an app route before onboarding goes to the welcome step', async ({ page }) => {
  await page.goto('/today')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await page.goto('/onboarding/not-a-step')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
})

test('choose a theme, step through with a city, land on Today; a reload keeps it', async ({
  page,
  errors,
  context,
}) => {
  // No permission is granted: the city path must not need one.
  await context.clearPermissions()
  await page.goto('/')
  const html = page.locator('html')

  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await onboardWithCity(page)
  await expect(page.getByText(/London/).first()).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  // A finished flow is not offered again.
  await page.goto('/onboarding/welcome')
  await expect(page).toHaveURL(/\/today$/)
  expect(errors).toEqual([])
})

test('Back walks the steps in reverse, keeping what was chosen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await expect(page).toHaveURL(/\/onboarding\/location$/)
  await page.getByRole('textbox', { name: en.location.search }).fill('London')
  await page.getByRole('button', { name: /^London Westminster, United Kingdom/ }).click()
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await expect(page).toHaveURL(/\/onboarding\/you$/)

  await page.getByRole('button', { name: en.onboarding.back }).click()
  await expect(page).toHaveURL(/\/onboarding\/location$/)
  await expect(
    page.getByRole('button', { name: /^London Westminster, United Kingdom/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: en.onboarding.back }).click()
  await expect(page).toHaveURL(/\/onboarding\/how$/)
  await page.getByRole('button', { name: en.onboarding.back }).click()
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  // Each step is its own URL: a reload stays on it.
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await expect(page).toHaveURL(/\/onboarding\/how$/)
  await page.reload()
  await expect(page.getByText(en.onboarding.howTitle)).toBeVisible()
})

test('Arabic: the whole flow runs right to left', async ({ page, errors }) => {
  await page.goto('/')
  await page.getByRole('button', { name: en.language.names.ar, exact: true }).click()
  const html = page.locator('html')
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'ar')
  await expect(page.getByText(ar.onboarding.welcomeTitle)).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

  await onboardWithCity(page, ar)
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: ar.plan.prayers })).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

  await page.reload()
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('checkbox', { name: ar.prayer.dhuhr })).toBeVisible()
  expect(errors).toEqual([])
})
