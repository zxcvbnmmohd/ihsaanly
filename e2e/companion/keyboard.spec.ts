// The companion by keyboard alone: Tab reaches only visible, ringed controls,
// Space marks a prayer, Enter follows a tab-bar link, Escape skips the tour.
import { en } from '@ihsaanly/core/strings/en'
import { tabStops } from '../support/focus.ts'
import { expect, skipTour, test, useOnboarded } from './fixtures.ts'

useOnboarded()
test.skip(({ isMobile }) => isMobile, 'keyboard journeys run at desktop size; mobile is touch')

test('Tab moves through Today and every stop is a visible control with a focus ring', async ({
  page,
}) => {
  await page.goto('/today')
  await skipTour(page)
  // Tab from the top of the page, not from where the tour left focus.
  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
  const stops = await tabStops(page, 15)
  expect(stops.filter((stop) => stop === '')).toEqual([])
  expect(new Set(stops).size).toBeGreaterThan(5)
})

test('Space toggles the focused prayer', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  const dhuhr = page.getByRole('checkbox', { name: en.prayer.dhuhr })
  await dhuhr.focus()
  await expect(dhuhr).toBeFocused()
  await page.keyboard.press('Space')
  await expect(dhuhr).toBeChecked()
  await page.keyboard.press('Space')
  await expect(dhuhr).not.toBeChecked()
})

test('the tab bar is reachable and Enter opens Library, then More', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  const nav = page.getByRole('navigation')
  await nav.getByRole('link', { name: en.library.title }).first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: en.library.searchLabel })).toBeVisible()
  await nav.getByRole('link', { name: en.more.title }).first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: en.more.searchLabel })).toBeVisible()
})

test('the first-run tour takes focus; Skip is one Shift+Tab away and Enter skips', async ({
  page,
}) => {
  await page.goto('/today')
  const skip = page.getByRole('button', { name: en.tour.skip })
  // Focus moves onto Next in the tip; Skip sits just before it.
  await expect(page.getByRole('button', { name: en.tour.next })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(skip).toBeHidden()
})

test('Escape skips the first-run tour', async ({ page }) => {
  await page.goto('/today')
  const skip = page.getByRole('button', { name: en.tour.skip })
  await expect(page.getByRole('button', { name: en.tour.next })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(skip).toBeHidden()
})
