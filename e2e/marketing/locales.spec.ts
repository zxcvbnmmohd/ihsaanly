// Every language's home page: the right language and direction on <html>,
// nothing in the console (CSP violations included), and nothing wider than
// the screen. The marketing project checks 1280 px, marketing-mobile 375 px.
import { expect, test } from '@playwright/test'
import { collectErrors } from '../support/console.ts'
import { horizontalOverflow } from '../support/layout.ts'
import { LOCALES, pageUrl } from './site.ts'

for (const locale of LOCALES) {
  test(`${locale.code} home: lang, dir and no console errors`, async ({ page }) => {
    const errors = collectErrors(page)
    const response = await page.goto(pageUrl(locale, ''))
    expect(response?.status()).toBe(200)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', locale.lang)
    await expect(html).toHaveAttribute('dir', locale.dir)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test(`${locale.code} home: no sideways scroll`, async ({ page }) => {
    await page.goto(pageUrl(locale, ''))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
}
