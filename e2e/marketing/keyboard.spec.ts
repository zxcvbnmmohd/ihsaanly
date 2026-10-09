// The site by keyboard alone: Tab reaches only visible, ringed controls, the
// skip link jumps to the content, the language menu and the questions open
// with Enter and Space, and the demo phone's prayer ticks with Space.
import { expect, test } from '@playwright/test'
import { FIXED_NOW } from '../support/clock.ts'
import { tabStops } from '../support/focus.ts'
import { t } from './site.ts'

test.skip(({ isMobile }) => isMobile, 'keyboard journeys run at desktop size; mobile is touch')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.goto('/')
})

test('Tab moves through the page and every stop is a visible control with a focus ring', async ({
  page,
}) => {
  const stops = await tabStops(page, 15)
  expect(stops.filter((stop) => stop === '')).toEqual([])
  expect(new Set(stops).size).toBeGreaterThan(5)
})

test('the skip link is the first stop and Enter jumps to the content', async ({ page }) => {
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: t('common.skip') })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
  // The next stop is inside main, past the header.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('main').locator(':focus')).toHaveCount(1)
})

test('the language menu opens with Enter and Escape closes it back onto its button', async ({
  page,
}) => {
  const summary = page.getByRole('banner').locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  const french = page.getByRole('banner').locator('a[data-locale="fr"]')
  await expect(french).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('banner').locator('a[data-locale]').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(french).toBeHidden()
  await expect(summary).toBeFocused()
})

test('a question opens with Enter and closes with Space', async ({ page }) => {
  const question = page.locator('summary', { hasText: t('home.questions.timesQ') })
  const answer = page.getByText(t('home.questions.timesA'))
  await question.focus()
  await expect(answer).toBeHidden()
  await page.keyboard.press('Enter')
  await expect(answer).toBeVisible()
  await page.keyboard.press('Space')
  await expect(answer).toBeHidden()
})

test("the demo phone's prayer ticks with Space", async ({ page }) => {
  const phone = page.getByRole('region', { name: t('home.demo.label') })
  await phone.scrollIntoViewIfNeeded()
  const dhuhr = phone.getByRole('checkbox', { name: 'Dhuhr' })
  await dhuhr.focus()
  await expect(dhuhr).toBeFocused()
  await page.keyboard.press('Space')
  await expect(dhuhr).toBeChecked()
  await page.keyboard.press('Space')
  await expect(dhuhr).not.toBeChecked()
})
