// What a crawler reads: the canonical URL, one hreflang per language plus
// x-default, the JSON-LD block, robots.txt and the sitemap.
import { expect, test } from '@playwright/test'
import { LOCALES, pageUrl } from './site.ts'

const BASE = 'https://ihsaanly.app'

test('the home page carries canonical, hreflang and JSON-LD', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/`)

  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) =>
      links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')]),
    )
  for (const locale of LOCALES) {
    expect(alternates).toContainEqual([locale.hreflang, `${BASE}${pageUrl(locale, '')}`])
  }
  expect(alternates).toContainEqual(['x-default', `${BASE}/`])

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(blocks.length).toBeGreaterThan(0)
  const data = blocks.map((text) => JSON.parse(text) as Record<string, unknown>)
  expect(data.some((block) => block['@context'] === 'https://schema.org')).toBe(true)

  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${BASE}/`)
  // A production build is indexable.
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
})

test('a translated home page points its canonical at itself', async ({ page }) => {
  await page.goto('/ar/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/ar/`)
})

test('robots.txt allows crawling and names the sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('User-agent: *')
  expect(body).toContain('Allow: /')
  expect(body).not.toContain('Disallow: /')
  expect(body).toContain(`Sitemap: ${BASE}/sitemap.xml`)
})

test('the sitemap lists every language of every page', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('<urlset')
  for (const locale of LOCALES) {
    for (const path of ['', 'legal/privacy/', 'legal/terms/', 'legal/delete-account/']) {
      expect(xml).toContain(`<loc>${BASE}${pageUrl(locale, path)}</loc>`)
    }
  }
})
