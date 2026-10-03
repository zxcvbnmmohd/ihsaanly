// Send feedback on the web. It needs an account, so the cloud build (with
// placeholder Firebase values, never reached) explains that and offers
// sign-in and email; the local-only build has no Send feedback row at all.
import { en } from '@ihsaanly/core/strings/en'
import { ONBOARDED_STATE } from '../support/global-setup.ts'
import { COMPANION_CLOUD_URL } from '../support/ports.ts'
import { expect, test } from './fixtures.ts'

test.describe('cloud build, signed out', () => {
  test.use({ baseURL: COMPANION_CLOUD_URL })

  test('More → Send feedback asks to sign in, with email as the fallback', async ({
    page,
    errors,
  }) => {
    await page.goto('/onboarding/location')
    await page.getByRole('textbox', { name: en.location.search }).fill('London')
    await page.getByRole('button', { name: /^London Westminster, United Kingdom/ }).click()
    await page.getByRole('button', { name: en.onboarding.continue }).click()
    await page.getByRole('button', { name: en.onboarding.continue }).click()
    await page.getByRole('button', { name: en.onboarding.allowNotifications }).click()
    await page.getByRole('button', { name: en.onboarding.done }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.goto('/more')
    await page.getByRole('main').locator('a[href="/feedback"]').first().click()
    await expect(page).toHaveURL(/\/feedback$/)
    await expect(page).toHaveTitle(`${en.feedback.title} · Ihsaanly`)

    const main = page.getByRole('main')
    await expect(main.getByText(en.feedback.signedOut)).toBeVisible()
    await expect(main.getByRole('textbox', { name: en.feedback.messageLabel })).toHaveCount(0)
    await expect(main.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )

    await main.getByRole('button', { name: en.feedback.signIn }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByRole('button', { name: en.account.signInWithGoogle })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('local-only build', () => {
  test.use({ storageState: ONBOARDED_STATE })

  test('More has no Send feedback row', async ({ page, errors }) => {
    await page.goto('/more')
    await expect(page.getByRole('main').locator('a[href="/location"]').first()).toBeVisible()
    await expect(page.locator('a[href="/feedback"]')).toHaveCount(0)
    await expect(page.getByText(en.feedback.title, { exact: true })).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
