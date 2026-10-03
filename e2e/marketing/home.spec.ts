// The home page as a visitor meets it: the hero, the way into the companion,
// the store badges before launch, and the phone demo they can play with.

import { en } from '@ihsaanly/core/strings/en'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { FIXED_NOW } from '../support/clock.ts'
import { collectErrors } from '../support/console.ts'
import { COMPANION_HREF, t } from './site.ts'

test.beforeEach(async ({ page }) => {
  // The demo shows the part of the day it is: pin the clock so it is always after Dhuhr.
  await page.clock.setFixedTime(FIXED_NOW)
})

test('the hero, the companion link and the store badges', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/Ihsaanly/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const header = page.getByRole('banner')
  const cta = header.getByRole('link', {
    name: new RegExp(`^(${t('common.openApp')}|${t('common.openAppShort')})$`),
  })
  await expect(cta).toHaveAttribute('href', COMPANION_HREF)
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Web app' }),
  ).toHaveAttribute('href', COMPANION_HREF)

  const status = page.getByRole('main').getByRole('status').first()
  const badges = [
    { name: /App Store/, toast: t('home.stores.soon').replace('{store}', 'App Store') },
    { name: /Google Play/, toast: t('home.stores.soon').replace('{store}', 'Google Play') },
    { name: /Chrome Web Store/, toast: t('home.stores.chromeSoon') },
  ]
  for (const { name, toast } of badges) {
    const badge = page.getByRole('main').getByRole('button', { name })
    await expect(badge).toHaveAttribute('aria-disabled', 'true')
    // aria-disabled, not disabled: it still answers a tap, with the toast.
    await badge.click({ force: true })
    await expect(status).toHaveText(toast)
  }
  expect(errors).toEqual([])
})

test.describe('the "try it right here" demo', () => {
  const demo = (page: Page): Locator => page.getByRole('region', { name: t('home.demo.label') })

  test('marking a prayer brings up what follows it', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    const phone = demo(page)
    const dhuhr = phone.getByRole('checkbox', { name: 'Dhuhr' })
    await expect(dhuhr).not.toBeChecked()
    await expect(phone.getByRole('link', { name: 'Two rak’ah after Dhuhr' })).toHaveCount(0)

    await dhuhr.click()
    await expect(dhuhr).toBeChecked()
    await expect(phone.getByRole('link', { name: 'Two rak’ah after Dhuhr' })).toBeVisible()

    await dhuhr.click()
    await expect(dhuhr).not.toBeChecked()
    await expect(phone.getByRole('link', { name: 'Two rak’ah after Dhuhr' })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('ticking a circle moves the item under Done today, and Undo brings it back', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    const phone = demo(page)
    const title = 'Two rak’ah after Dhuhr'
    await phone.getByRole('checkbox', { name: 'Dhuhr' }).click()
    await expect(phone.getByRole('link', { name: en.today.open(title) })).toBeVisible()

    await phone.getByRole('button', { name: en.today.markDone(title) }).click()
    await expect(phone.getByRole('link', { name: en.today.open(title) })).toHaveCount(0)
    await expect(phone.getByRole('button', { name: en.today.doneToday(1) })).toBeVisible()

    await phone.getByRole('button', { name: en.today.undoItem(title) }).click()
    await expect(phone.getByRole('link', { name: en.today.open(title) })).toBeVisible()
    await expect(phone.getByRole('button', { name: en.today.doneToday(1) })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('opening an item shows its source, and Back returns', async ({ page }) => {
    await page.goto('/')
    const phone = demo(page)
    await phone.getByRole('checkbox', { name: 'Dhuhr' }).click()
    await phone.getByRole('link', { name: 'Two rak’ah after Dhuhr' }).click()

    await expect(phone.getByRole('heading', { name: 'Two rak’ah after Dhuhr' })).toBeVisible()
    await expect(phone.getByRole('heading', { name: 'Evidence' })).toBeVisible()
    await expect(phone.getByText(/Sahih Muslim 728/)).toBeVisible()

    await phone.getByRole('button', { name: 'Back' }).click()
    await expect(phone.getByRole('checkbox', { name: 'Dhuhr' })).toBeChecked()
  })

  test('the tabs follow the arrow, Home and End keys', async ({ page }) => {
    await page.goto('/')
    const tabs = demo(page).getByRole('tablist')
    const selected = tabs.getByRole('tab', { selected: true })
    await expect(selected).toHaveText('Today')

    await tabs.getByRole('tab', { name: 'Today' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(selected).toHaveText('Library')
    await expect(tabs.getByRole('tab', { name: 'Library' })).toBeFocused()
    await expect(demo(page).getByRole('tabpanel')).toHaveAccessibleName('Library')

    await page.keyboard.press('End')
    await expect(selected).toHaveText('More')
    await page.keyboard.press('ArrowRight') // wraps round
    await expect(selected).toHaveText('Today')
    await page.keyboard.press('ArrowLeft') // and back
    await expect(selected).toHaveText('More')
    await page.keyboard.press('Home')
    await expect(selected).toHaveText('Today')
    await expect(tabs.getByRole('tab', { name: 'Today' })).toBeFocused()
  })
})
