import { expect, test } from './fixtures.ts'
import { chooseCity, go } from './helpers.ts'

test('language: Arabic flips the document to RTL and survives reopen', async ({ openPopup }) => {
  const { page, errors } = await openPopup('/language')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await page.getByRole('radio', { name: 'العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('radio', { name: 'العربية' })).toHaveAttribute('aria-checked', 'true')
  await page.close()

  const reopened = await openPopup('/')
  await expect(reopened.page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(reopened.page.locator('html')).toHaveAttribute('lang', 'ar')
  await go(reopened.page, '/language')
  await reopened.page.getByRole('radio', { name: 'English' }).click()
  await expect(reopened.page.locator('html')).toHaveAttribute('dir', 'ltr')
  expect(errors).toEqual([])
})

test('theme: dark and light set data-theme, persist, and system clears it', async ({
  openPopup,
}) => {
  const { page } = await openPopup('/appearance')
  const html = page.locator('html')
  await expect(page.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.close()

  const reopened = await openPopup('/')
  // The pre-paint theme.js applies it before React renders.
  await expect(reopened.page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await go(reopened.page, '/appearance')
  await reopened.page.getByRole('radio', { name: 'Light' }).click()
  await expect(reopened.page.locator('html')).toHaveAttribute('data-theme', 'light')
  await reopened.page.getByRole('radio', { name: 'System' }).click()
  await expect(reopened.page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
})

test('location: choosing a city updates Settings and Today', async ({ openPopup }) => {
  const { page } = await openPopup('/')
  await chooseCity(page, 'Cairo', /^Cairo/)
  await expect(page.getByText('PRAYERS')).toBeVisible()
  await expect(page.getByText(/Cairo/).first()).toBeVisible()
  await page.getByRole('link', { name: 'More' }).click()
  await expect(page.getByText(/Cairo/).first()).toBeVisible()
  await expect(page.getByText('Not set')).toBeHidden()
})

test('location: a query with no match says so', async ({ openPopup }) => {
  const { page } = await openPopup('/location')
  await page.getByPlaceholder('Search for a city').fill('zzzzqqq')
  await expect(page.getByText(/no (cities|results|matches)/i).first()).toBeVisible()
})

test('prayer calculation and hijri choices persist', async ({ openPopup }) => {
  const first = await openPopup('/calculation')
  await first.page.getByRole('radio', { name: 'Hanafi' }).click()
  await expect(first.page.getByRole('radio', { name: 'Hanafi' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await go(first.page, '/hijri')
  await first.page.getByRole('radio', { name: '+1 day' }).click()
  await first.page.close()

  const { page } = await openPopup('/calculation')
  await expect(page.getByRole('radio', { name: 'Hanafi' })).toHaveAttribute('aria-checked', 'true')
  await go(page, '/hijri')
  await expect(page.getByRole('radio', { name: '+1 day' })).toHaveAttribute('aria-checked', 'true')
})

test('notification toggles persist across popup reopen', async ({ openPopup }) => {
  const first = await openPopup('/notifications')
  const prayers = first.page.getByRole('switch', { name: /^Prayer reminders/ })
  await expect(prayers).toHaveAttribute('aria-checked', 'false')
  await prayers.click()
  await expect(prayers).toHaveAttribute('aria-checked', 'true')
  const fasting = first.page.getByRole('switch', { name: 'Upcoming fasting days' })
  await fasting.click()
  await expect(fasting).toHaveAttribute('aria-checked', 'false')
  await first.page.getByRole('radio', { name: 'Off' }).click()
  await first.page.getByRole('radio', { name: '5' }).click()
  await first.page.close()

  const { page } = await openPopup('/notifications')
  await expect(page.getByRole('switch', { name: /^Prayer reminders/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByRole('switch', { name: 'Upcoming fasting days' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: '5' })).toHaveAttribute('aria-checked', 'true')
})

test('notifications screen reports the permission and the test button works', async ({
  openPopup,
}) => {
  const { page, errors } = await openPopup('/notifications')
  await expect(page.getByText('Permission')).toBeVisible()
  await expect(page.getByText('Allowed')).toBeVisible()
  await page.getByRole('button', { name: /Send a test reminder/ }).click()
  expect(errors).toEqual([])
})
