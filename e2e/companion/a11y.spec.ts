// axe (WCAG 2.0–2.2 A and AA): no violations of any impact on the
// welcome step, Today, More and Account.
import { en } from '@ihsaanly/core/strings/en'
import { axeViolations } from '../support/axe.ts'
import { ONBOARDED_STATE } from '../support/global-setup.ts'
import { COMPANION_CLOUD_URL } from '../support/ports.ts'
import { expect, skipTour, test } from './fixtures.ts'

test('axe: onboarding welcome', async ({ page }) => {
  await page.goto('/onboarding/welcome')
  await expect(page.getByText(en.onboarding.welcomeTitle)).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
})

test.describe('onboarded', () => {
  test.use({ storageState: ONBOARDED_STATE })

  test('axe: Today, with the first-run tour', async ({ page }) => {
    await page.goto('/today')
    await expect(page.getByText(en.tour.prayer)).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })

  test('axe: Today', async ({ page }) => {
    await page.goto('/today')
    await skipTour(page)
    await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })

  test('axe: More', async ({ page }) => {
    await page.goto('/more')
    await expect(page.getByRole('textbox', { name: en.more.searchLabel })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })
})

test.describe('cloud build', () => {
  test.use({ baseURL: COMPANION_CLOUD_URL })

  test('axe: Account (restore from onboarding)', async ({ page }) => {
    await page.goto('/account?from=onboarding')
    await expect(page.getByText(en.account.restore.intro)).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })
})
