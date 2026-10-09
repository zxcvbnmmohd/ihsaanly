// The service worker: after one visit online, the app opens with no network
// at all and Today still renders.
import { en } from '@ihsaanly/core/strings/en'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

test('after the first load, the app opens offline', async ({ page, context }) => {
  await page.goto('/today')
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()

  // Wait for the worker to take control and finish its precache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      )
    }
  })
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await caches.keys()
        if (keys.length === 0) return false
        const cache = await caches.open(keys[0] as string)
        return (await cache.match('/index.html')) !== undefined
      }),
    )
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  // Another route's code split chunk comes from the precache too.
  await page.getByRole('navigation').getByRole('link', { name: en.library.title }).first().click()
  await expect(page.getByRole('textbox', { name: en.library.searchLabel })).toBeVisible()
  await context.setOffline(false)
})
