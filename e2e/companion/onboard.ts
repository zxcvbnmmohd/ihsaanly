import { en, type Strings } from '@ihsaanly/core/strings/en'
import { expect, type Page } from '@playwright/test'

/**
 * Walks a first run through onboarding the way someone without a location
 * permission would: welcome → how → location (search for a city) → you →
 * reminders → start, landing on Today. `page` must be on the welcome step,
 * already in the language `strings` belongs to.
 */
export async function onboardWithCity(page: Page, strings: Strings = en): Promise<void> {
  const s = strings.onboarding
  const next = page.getByRole('button', { name: s.continue, exact: true })
  await expect(page.getByText(s.welcomeTitle)).toBeVisible()
  await next.click()

  await expect(page).toHaveURL(/\/onboarding\/how$/)
  await expect(page.getByText(s.howTitle)).toBeVisible()
  await next.click()

  await expect(page).toHaveURL(/\/onboarding\/location$/)
  await expect(page.getByText(s.locationStep)).toBeVisible()
  await expect(next).toBeDisabled()
  await page.getByRole('textbox', { name: strings.location.searchLabel }).fill('London')
  await page.getByRole('button', { name: /^London Westminster, United Kingdom/ }).click()
  await expect(page.getByText(strings.location.follows)).toBeVisible()
  await next.click()

  await expect(page).toHaveURL(/\/onboarding\/you$/)
  await expect(page.getByRole('radio', { name: new RegExp(`^${s.skip}`) })).toBeChecked()
  await next.click()

  await expect(page).toHaveURL(/\/onboarding\/reminders$/)
  await expect(page.getByText(s.remindersStep, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: s.allowNotifications }).click()

  await expect(page).toHaveURL(/\/onboarding\/start$/)
  await expect(page.getByRole('radio', { name: new RegExp(`^${s.essentials}`) })).toBeChecked()
  await page.getByRole('button', { name: s.done, exact: true }).click()

  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('checkbox', { name: strings.prayer.dhuhr })).toBeVisible()
}
