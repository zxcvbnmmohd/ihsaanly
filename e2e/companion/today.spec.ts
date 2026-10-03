// Today, onboarded in London at 13:30 on a Tuesday: marking and unmarking a
// prayer, what that changes on the page, and History.
import { en } from '@ihsaanly/core/strings/en'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

test('mark Dhuhr, see it kept, unmark it', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await expect(page).toHaveTitle(`${en.today.title} · Ihsaanly`)

  const dhuhr = page.getByRole('checkbox', { name: en.prayer.dhuhr })
  await expect(dhuhr).not.toBeChecked()
  // Before Dhuhr is marked, its "before" sunnah is what is asked right now.
  await expect(
    page.getByRole('link', { name: 'Two or four rak’ah before Dhuhr' }).first(),
  ).toBeVisible()

  await dhuhr.click()
  await expect(dhuhr).toBeChecked()
  await expect(page.getByRole('link', { name: 'Two rak’ah after Dhuhr' }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).not.toBeChecked()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).not.toBeChecked()
  expect(errors).toEqual([])
})

test('History shows a marked prayer', async ({ page }) => {
  await page.goto('/history')
  await expect(page.getByText(en.history.empty)).toBeVisible()

  await page.goto('/today')
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  await page.getByRole('navigation').getByRole('link', { name: en.more.title }).first().click()
  await page.getByRole('link', { name: en.history.title }).first().click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByText(en.history.daysActive(1))).toBeVisible()
  await expect(
    page.getByText(new RegExp(`${en.prayer.dhuhr} · ${en.history.times(1)}`)),
  ).toBeVisible()
})

test('the tab bar moves between Today, Library and More', async ({ page }) => {
  await page.goto('/today')
  const nav = page.getByRole('navigation')
  await nav.getByRole('link', { name: en.library.title }).first().click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole('textbox', { name: en.library.search })).toBeVisible()
  await nav.getByRole('link', { name: en.more.title }).first().click()
  await expect(page.getByRole('textbox', { name: en.more.search })).toBeVisible()
  await nav.getByRole('link', { name: en.today.title }).first().click()
  await expect(page).toHaveURL(/\/today$/)
})

test('the keyboard marks a prayer: Space toggles the focused checkbox', async ({ page }) => {
  await page.goto('/today')
  const dhuhr = page.getByRole('checkbox', { name: en.prayer.dhuhr })
  await dhuhr.focus()
  await expect(dhuhr).toBeFocused()
  await page.keyboard.press('Space')
  await expect(dhuhr).toBeChecked()
  await page.keyboard.press('Space')
  await expect(dhuhr).not.toBeChecked()
})
