import { expect, test } from './fixtures.ts'
import { chooseCity } from './helpers.ts'

test('the service worker registers and the popup opens on its extension id', async ({
  worker,
  extensionId,
  openPopup,
}) => {
  expect(worker.url()).toBe(`chrome-extension://${extensionId}/background.js`)
  expect(extensionId).toMatch(/^[a-p]{32}$/)
  const { page, errors } = await openPopup()
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page).toHaveTitle('Ihsaanly')
  expect(errors).toEqual([])
})

test("first open asks for a location, then renders today's plan", async ({ openPopup }) => {
  const { page, errors } = await openPopup()
  await expect(page.getByText('Where are you?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible()

  await chooseCity(page)

  await expect(page.getByText('Where are you?')).toBeHidden()
  await expect(page.getByText('PRAYERS')).toBeVisible()
  for (const prayer of ['Fajr', 'Asr', 'Maghrib', 'Isha']) {
    await expect(page.getByRole('checkbox', { name: prayer })).toBeVisible()
  }
  await expect(page.getByText('UP NEXT')).toBeVisible()
  await expect(page.getByText(/London/).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the chosen place survives closing and reopening the popup', async ({ openPopup }) => {
  const first = await openPopup()
  await chooseCity(first.page)
  await expect(first.page.getByText('PRAYERS')).toBeVisible()
  await first.page.close()

  const { page } = await openPopup()
  await expect(page.getByText('PRAYERS')).toBeVisible()
  await expect(page.getByText('Where are you?')).toBeHidden()
})
