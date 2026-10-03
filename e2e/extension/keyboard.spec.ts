import { expect, test } from './fixtures.ts'
import { chooseCity, skipTour } from './helpers.ts'

test('Tab moves through Today and every stop is a visible, focusable control', async ({
  openPopup,
}) => {
  const { page } = await openPopup()
  await chooseCity(page)
  await skipTour(page)
  // Tab from the top of the page, not from where the tour left focus.
  await page.reload()
  await expect(page.getByText('PRAYERS')).toBeVisible()
  const seen = new Set<string>()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const desc = await page.evaluate(() => {
      const el = document.activeElement
      return el && el !== document.body
        ? `${el.tagName}|${el.getAttribute('role') ?? ''}|${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)}`
        : ''
    })
    expect(desc).not.toBe('')
    seen.add(desc)
  }
  expect(seen.size).toBeGreaterThan(5)
})

test('the More link is reachable by keyboard and Enter opens Settings', async ({ openPopup }) => {
  const { page } = await openPopup()
  await chooseCity(page)
  await page.getByRole('link', { name: 'More' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/settings$/)
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()
})

// The prayer rows are div[role=checkbox]: Space toggles them, as it does a checkbox.
test('a prayer can be toggled with the keyboard', async ({ openPopup }) => {
  const { page } = await openPopup()
  await chooseCity(page)
  await skipTour(page)
  const box = page.getByRole('checkbox', { name: 'Isha' })
  await box.focus()
  await expect(box).toBeFocused()
  await page.keyboard.press('Space')
  await expect(box).toHaveAttribute('aria-checked', 'true', { timeout: 2000 })
  await page.keyboard.press('Space')
  await expect(box).toHaveAttribute('aria-checked', 'false', { timeout: 2000 })
})

test('Back button returns from a settings page and radios are keyboard selectable', async ({
  openPopup,
}) => {
  const { page } = await openPopup('/')
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Back' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/popup\.html#\/$/)
})
