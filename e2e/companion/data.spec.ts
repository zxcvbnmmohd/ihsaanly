// Your data: an export downloads a JSON file, importing that file into
// another browser brings the record across, and deleting everything starts
// the app over at onboarding.
import { readFileSync, writeFileSync } from 'node:fs'
import { en } from '@ihsaanly/core/strings/en'
import { FIXED_NOW } from '../support/clock.ts'
import { ONBOARDED_STATE } from '../support/global-setup.ts'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

test('export a file, import it on another device', async ({ page, browser, baseURL }, info) => {
  await page.goto('/today')
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  await page.goto('/data')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: new RegExp(`^${en.data.export}`) }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const file = info.outputPath(download.suggestedFilename())
  await download.saveAs(file)
  const exported = JSON.parse(readFileSync(file, 'utf8')) as {
    format: string
    events: unknown[]
    preferences: { place?: { label: string } }
  }
  expect(exported.format).toBe('ihsaanly-export')
  expect(exported.preferences.place?.label).toMatch(/^London/)
  expect(exported.events.length).toBeGreaterThan(0)

  // A second browser, onboarded but with nothing recorded.
  const { viewport, isMobile, hasTouch, locale, timezoneId } = info.project.use
  const other = await browser.newContext({
    viewport,
    isMobile,
    hasTouch,
    locale,
    timezoneId,
    baseURL,
    storageState: ONBOARDED_STATE,
  })
  const second = await other.newPage()
  await second.clock.setFixedTime(FIXED_NOW)
  await second.goto('/history')
  await expect(second.getByText(en.history.empty)).toBeVisible()

  await second.goto('/data')
  const [chooser] = await Promise.all([
    second.waitForEvent('filechooser'),
    second.getByRole('button', { name: new RegExp(`^${en.data.importing}`) }).click(),
  ])
  await chooser.setFiles(file)
  await expect(second.getByText(/^Added \d+ (entry|entries)\.$/)).toBeVisible()

  await second.goto('/history')
  await expect(
    second.getByText(new RegExp(`${en.prayer.dhuhr} · ${en.history.times(1)}`)),
  ).toBeVisible()
  await second.goto('/today')
  await expect(second.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  // The same file twice changes nothing.
  await second.goto('/data')
  const [again] = await Promise.all([
    second.waitForEvent('filechooser'),
    second.getByRole('button', { name: new RegExp(`^${en.data.importing}`) }).click(),
  ])
  await again.setFiles(file)
  await expect(second.getByText(en.data.imported(0))).toBeVisible()
  await other.close()
})

test('a file that is not an export is refused', async ({ page }, info) => {
  const file = info.outputPath('not-an-export.json')
  writeFileSync(file, '{"hello": "world"}')
  await page.goto('/data')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: new RegExp(`^${en.data.importing}`) }).click(),
  ])
  await chooser.setFiles(file)
  await expect(page.getByText(en.data.importFailed)).toBeVisible()
})

test('cancelling delete keeps everything', async ({ page }) => {
  await page.goto('/data')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: new RegExp(`^${en.data.delete}`) }).click()
  await page.goto('/today')
  await expect(page).toHaveURL(/\/today$/)
})

test('delete all data starts over at onboarding', async ({ page }) => {
  await page.goto('/today')
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await page.goto('/data')

  page.once('dialog', (dialog) => {
    expect(dialog.type()).toBe('confirm')
    expect(dialog.message()).toContain(en.data.deleteConfirmTitle)
    void dialog.accept()
  })
  await page.getByRole('button', { name: new RegExp(`^${en.data.delete}`) }).click()
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await expect(page.getByText(en.onboarding.welcomeTitle)).toBeVisible()

  await page.goto('/today')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  const stored = await page.evaluate(() => localStorage.getItem('ihsaanly.db.v1'))
  expect(stored ?? '').not.toContain('London')
})
