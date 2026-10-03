import { expect, test } from './fixtures.ts'
import { go } from './helpers.ts'

test.describe('cloud build (dummy env)', () => {
  test.use({ flavour: 'cloud' })

  test('Settings shows the Account row and the screen offers Google only', async ({
    openPopup,
  }) => {
    const { page } = await openPopup('/settings')
    const row = page.locator('a[href$="#/account"]').first()
    await expect(row).toBeVisible()
    await go(page, '/account')
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Apple/ })).toHaveCount(0)
    await expect(page.getByText(/Privacy policy|privacy/i).first()).toBeVisible()
    // The sign-in notice about what syncing means.
    await expect(page.getByText(/sync/i).first()).toBeVisible()
  })
})

test.describe('local build (no cloud env)', () => {
  test('Settings has no Account row and /account is not offered', async ({ openPopup }) => {
    const { page, errors } = await openPopup('/settings')
    await expect(page.getByText('Reminders', { exact: true })).toBeVisible()
    await expect(page.locator('a[href$="#/account"]')).toHaveCount(0)
    await expect(page.getByText('Account', { exact: true })).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
