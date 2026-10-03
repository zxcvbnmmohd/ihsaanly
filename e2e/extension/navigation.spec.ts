import { expect, test } from './fixtures.ts'

// The rows are a react-native-web Pressable inside the RouterLink anchor; a
// real click must route in the popup (hash history), not follow the href.
test('clicking a Settings row opens its screen in the popup', async ({ openPopup }) => {
  const { page } = await openPopup('/')
  await page.getByRole('link', { name: 'More' }).click()
  // Even a native follow (open in a new tab) lands on the hash route.
  await expect(page.locator('a[href$="#/language"]')).toHaveCount(1)
  await page.getByText('Language', { exact: true }).click()
  await expect(page).toHaveURL(/popup\.html#\/language$/)
  await expect(page.getByRole('radio', { name: 'Français' })).toBeVisible()
})

test('the More icon and Back button navigate within the popup', async ({ openPopup }) => {
  const { page } = await openPopup('/')
  await page.getByRole('link', { name: 'More' }).click()
  await expect(page).toHaveURL(/#\/settings$/)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/popup\.html#\/$/)
})
