// axe (WCAG 2.0–2.2 A and AA): no serious or critical violations on the home
// page, the legal pages in English and Arabic, and the 404 page.
import { expect, test } from '@playwright/test'
import { seriousViolations } from '../support/axe.ts'
import { FIXED_NOW } from '../support/clock.ts'

const PAGES = [
  '/',
  '/ar/',
  '/legal/privacy/',
  '/legal/terms/',
  '/legal/delete-account/',
  '/ar/legal/privacy/',
  '/ar/legal/terms/',
  '/ar/legal/delete-account/',
  '/no-such-page',
]

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(await seriousViolations(page)).toEqual([])
  })
}

test('axe: the home page in dark mode', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.goto('/?theme=dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.waitForLoadState('networkidle')
  expect(await seriousViolations(page)).toEqual([])
})
