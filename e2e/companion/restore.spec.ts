// The companion built with cloud config (placeholder Firebase values, never
// reached: the fixture blocks Google's hosts). Someone who already uses
// Ihsaanly can leave onboarding to sign in and restore, and come back.
import { en } from '@ihsaanly/core/strings/en'
import { COMPANION_CLOUD_URL } from '../support/ports.ts'
import { expect, test } from './fixtures.ts'

test.use({ baseURL: COMPANION_CLOUD_URL })

test('the restore link opens Account and "Back to setup" returns', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  const restore = page.getByRole('button', { name: en.onboarding.restore })
  await expect(restore).toBeVisible()

  await restore.click()
  await expect(page).toHaveURL(/\/account\?from=onboarding$/)
  await expect(page).toHaveTitle(`${en.account.title} · Ihsaanly`)
  await expect(page.getByText(en.account.restore.intro)).toBeVisible()
  await expect(page.getByRole('button', { name: en.account.signInWithApple })).toBeVisible()
  await expect(page.getByRole('button', { name: en.account.signInWithGoogle })).toBeVisible()
  await expect(page.getByRole('link', { name: en.account.terms })).toHaveAttribute(
    'href',
    'https://ihsaanly.app/legal/terms',
  )

  await page.getByRole('button', { name: en.account.restore.backToSetup }).click()
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await expect(page.getByText(en.onboarding.welcomeTitle)).toBeVisible()
  expect(errors).toEqual([])
})

test('after onboarding, More has an Account row', async ({ page }) => {
  await page.goto('/onboarding/location')
  await page.getByRole('textbox', { name: en.location.searchLabel }).fill('London')
  await page.getByRole('button', { name: /^London Westminster, United Kingdom/ }).click()
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await page.getByRole('button', { name: en.onboarding.continue }).click()
  await page.getByRole('button', { name: en.onboarding.allowNotifications }).click()
  await page.getByRole('button', { name: en.onboarding.done }).click()
  await expect(page).toHaveURL(/\/today$/)

  await page.goto('/more')
  await page.getByRole('main').locator('a[href="/account"]').first().click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByText(en.account.explanation)).toBeVisible()
  await expect(page.getByRole('button', { name: en.account.signInWithGoogle })).toBeVisible()
})
