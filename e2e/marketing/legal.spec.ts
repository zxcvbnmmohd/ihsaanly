// The legal pages in English and Arabic, the footer's links, and the page
// for an address that does not exist.
import { expect, test } from '@playwright/test'
import { collectErrors } from '../support/console.ts'
import { locale, pageUrl, t } from './site.ts'

const LEGAL = [
  { path: 'legal/privacy/', title: 'privacy.title' },
  { path: 'legal/terms/', title: 'terms.title' },
  { path: 'legal/delete-account/', title: 'deleteAccount.title' },
] as const

for (const code of ['en', 'ar'] as const) {
  for (const { path, title } of LEGAL) {
    test(`${code} ${path} renders its heading`, async ({ page }) => {
      const errors = collectErrors(page)
      const response = await page.goto(pageUrl(locale(code), path))
      expect(response?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('dir', locale(code).dir)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(t(title, code))
      // A real document, not an empty shell: several sections under the title.
      expect(
        await page.getByRole('main').getByRole('heading', { level: 2 }).count(),
      ).toBeGreaterThan(1)
      await page.waitForLoadState('networkidle')
      expect(errors).toEqual([])
    })
  }
}

for (const code of ['en', 'ar'] as const) {
  test(`every ${code} footer link resolves`, async ({ page, request, baseURL }) => {
    await page.goto(pageUrl(locale(code), ''))
    const links = page.getByRole('contentinfo').getByRole('link')
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href') ?? ''),
    )
    expect(hrefs.length).toBeGreaterThanOrEqual(5)

    for (const href of hrefs) {
      if (href.startsWith('mailto:')) {
        expect(href).toBe('mailto:support@ihsaanly.app')
        continue
      }
      const url = new URL(href, `${baseURL}${pageUrl(locale(code), '')}`)
      if (url.origin !== baseURL) {
        // Other Ihsaanly sites: checked for shape, never fetched from the suite.
        expect(url.protocol).toBe('https:')
        expect(url.hostname).toMatch(/(^|\.)ihsaanly\.app$/)
        continue
      }
      const response = await request.get(url.pathname)
      expect(response.status(), href).toBe(200)
      if (url.hash) {
        // An in-page target (Support → #questions) must exist on that page.
        await page.goto(url.pathname)
        await expect(page.locator(url.hash)).toHaveCount(1)
      }
    }
  })

  test(`following the ${code} footer's privacy link opens the policy`, async ({ page }) => {
    await page.goto(pageUrl(locale(code), ''))
    await page.getByRole('contentinfo').locator('a[href$="legal/privacy/"]').click()
    await expect(page).toHaveURL(new RegExp(`${pageUrl(locale(code), 'legal/privacy/')}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('privacy.title', code))
  })
}

for (const path of ['/no-such-page', '/ar/no-such-page/', '/legal/nothing-here/']) {
  test(`an unknown address (${path}) is a 404 page`, async ({ page }) => {
    const errors = collectErrors(page, [/Failed to load resource.*404/])
    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('notFound.title'))
    await page.getByRole('link', { name: 'Go to the home page' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(errors).toEqual([])
  })
}
