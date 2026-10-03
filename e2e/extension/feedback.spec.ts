import { en } from '@ihsaanly/core/strings/en'
import { expect, test } from './fixtures.ts'

test.describe('cloud build (dummy env)', () => {
  test.use({ flavour: 'cloud' })

  test('Settings shows Send feedback, and the page asks to sign in first', async ({
    openPopup,
  }) => {
    const { page, errors } = await openPopup('/settings')
    const row = page.locator('a[href$="#/feedback"]').first()
    await expect(row).toBeVisible()
    await expect(row).toContainText(en.feedback.title)
    await row.click()
    await expect(page.getByRole('heading', { name: en.feedback.title })).toBeVisible()
    await expect(page.getByText(en.feedback.signedOut)).toBeVisible()
    await expect(page.getByRole('button', { name: en.feedback.signIn })).toBeVisible()
    await expect(page.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )
    expect(errors).toEqual([])
  })
})

test.describe('local build (no cloud env)', () => {
  test('Settings has no Send feedback row', async ({ openPopup }) => {
    const { page, errors } = await openPopup('/settings')
    await expect(page.getByText('Reminders', { exact: true })).toBeVisible()
    await expect(page.locator('a[href$="#/feedback"]')).toHaveCount(0)
    await expect(page.getByText(en.feedback.title, { exact: true })).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
