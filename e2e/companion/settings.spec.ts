// More: every row of the settings list opens its page (with its own title),
// the list's search, and a setting that sticks (Appearance). At desktop
// width More is a two-pane layout that opens on Location; on a phone it is
// the list alone, and each page has a Back button.
import { en } from '@ihsaanly/core/strings/en'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

const ROWS = [
  { name: en.location.title, path: '/location' },
  { name: en.calculation.title, path: '/calculation' },
  { name: en.hijri.title, path: '/hijri' },
  { name: en.notifications.title, path: '/notifications' },
  { name: en.tracking.title, path: '/tracking' },
  { name: en.events.title, path: '/events' },
  { name: en.language.title, path: '/language' },
  { name: en.appearance.title, path: '/appearance' },
  { name: en.about.title, path: '/about' },
  { name: en.history.title, path: '/history' },
  { name: en.qada.title, path: '/qada' },
  { name: en.data.title, path: '/data' },
]

test('every row of More opens its page', async ({ page, errors, isMobile }) => {
  await page.goto('/more')
  // Desktop opens the first page beside the list; a phone shows the list alone.
  await expect(page).toHaveURL(isMobile ? /\/more$/ : /\/location$/)
  await expect(page).toHaveTitle(`${isMobile ? en.more.title : en.location.title} · Ihsaanly`)

  for (const { name, path } of ROWS) {
    await page.getByRole('main').locator(`a[href="${path}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page).toHaveTitle(`${name} · Ihsaanly`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    if (isMobile) {
      await page.getByRole('button', { name: en.onboarding.back }).click()
      await expect(page).toHaveURL(/\/more$/)
    }
  }
  // The local-only build has no Account row.
  await expect(page.locator('a[href="/account"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('searching settings narrows the list', async ({ page }) => {
  await page.goto('/more')
  const main = page.getByRole('main')
  await main.getByRole('textbox', { name: en.more.searchLabel }).fill('data')
  await expect(main.locator('a[href="/data"]').first()).toBeVisible()
  await expect(main.locator('a[href="/hijri"]')).toHaveCount(0)
})

test('Appearance: Dark applies at once and survives a reload', async ({ page }) => {
  await page.goto('/appearance')
  const dark = page.getByRole('radio', { name: 'Dark' })
  await dark.click()
  await expect(dark).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
})

test('Location: a new city replaces the old one', async ({ page }) => {
  await page.goto('/location')
  await page.getByRole('textbox', { name: en.location.searchLabel }).fill('Manchester')
  await page
    .getByRole('button', { name: /^Manchester\b.*United Kingdom/ })
    .first()
    .click()
  await page.goto('/today')
  await expect(page.getByText(/Manchester/).first()).toBeVisible()
})
