// The small controls in the header: the language menu, the light/dark
// toggle, and the one-time "this page is available in …" suggestion.
import { expect, test } from '@playwright/test'
import { locale, t } from './site.ts'

test('the language menu switches the page and the URL', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('banner').getByRole('group')
  await menu.locator('summary').click()
  await menu.getByRole('link', { name: locale('fr').name }).click()

  await expect(page).toHaveURL(/\/fr\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(
    page.getByText(`${t('common.language.label', 'fr')}: ${locale('fr').name}`),
  ).toBeAttached()

  // And to a right-to-left language, from a legal page, keeping the page.
  await page.goto('/fr/legal/privacy/')
  await menu.locator('summary').click()
  await menu.getByRole('link', { name: locale('ar').name }).click()
  await expect(page).toHaveURL(/\/ar\/legal\/privacy\/$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('privacy.title', 'ar'))
})

test('Escape closes the language menu', async ({ page }) => {
  await page.goto('/')
  const details = page.getByRole('banner').locator('details')
  await details.locator('summary').click()
  await expect(details).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(details).not.toHaveAttribute('open', '')
})

test('the theme toggle cycles System → Light → Dark and survives a reload', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const label = (mode: string): string =>
    t('common.theme.current').replace('{mode}', t(`common.theme.${mode}`))
  const toggle = page.getByRole('banner').getByRole('button', { name: /^Appearance:/ })

  await expect(toggle).toHaveAccessibleName(label('system'))
  await expect(html).not.toHaveAttribute('data-theme', /./)

  await toggle.click()
  await expect(toggle).toHaveAccessibleName(label('light'))
  await expect(html).toHaveAttribute('data-theme', 'light')

  await toggle.click()
  await expect(toggle).toHaveAccessibleName(label('dark'))
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(toggle).toHaveAccessibleName(label('dark'))

  // Another page of the site picks the same choice up before first paint.
  await page.goto('/legal/terms/')
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await toggle.click()
  await expect(toggle).toHaveAccessibleName(label('system'))
  await page.reload()
  await expect(html).not.toHaveAttribute('data-theme', /./)
})

test.describe('a French-speaking visitor on the English page', () => {
  test.use({ locale: 'fr-FR' })

  test('is offered French once; dismissing it sticks', async ({ page }) => {
    const [before] = t('common.suggest.text', 'fr').split('{language}')
    const offer = page.getByText(before?.trim() ?? '')
    await page.goto('/')
    await expect(offer).toBeVisible()
    await expect(page.getByRole('link', { name: locale('fr').name }).first()).toHaveAttribute(
      'href',
      '/fr/',
    )

    await page.getByRole('button', { name: t('common.suggest.dismiss', 'fr') }).click()
    await expect(offer).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(offer).toBeHidden()
  })

  test('is not offered it on a page already in another language', async ({ page }) => {
    await page.goto('/ar/')
    await page.waitForLoadState('networkidle')
    const [before] = t('common.suggest.text', 'fr').split('{language}')
    await expect(page.getByText(before?.trim() ?? '')).toBeHidden()
  })
})
