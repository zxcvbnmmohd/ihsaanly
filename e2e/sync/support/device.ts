// One "device" is one browser context on the emulator-built companion: its own
// localStorage, its own Firebase session. Helpers drive the real UI by the
// strings in @ihsaanly/core/strings/en.
import { en } from '@ihsaanly/core/strings/en'
import { type Browser, test as base, expect, type Locator, type Page } from '@playwright/test'
import { collectErrors } from '../../support/console.ts'
import { type PopupOptions, withPopup } from './popup.ts'
import { resetEmulators } from './rest.ts'

export interface Device {
  page: Page
  /** Console errors, uncaught exceptions and failed requests so far. */
  readonly errors: string[]
}

async function openDevice(browser: Browser, baseURL: string): Promise<Device> {
  // No service worker: navigations are network-first anyway, and a worker
  // installing mid-test only adds timing to reloads.
  const context = await browser.newContext({ baseURL, serviceWorkers: 'block' })
  const page = await context.newPage()
  const raw = collectErrors(page)
  // The console line for a failed request has no URL; record which one it was.
  page.on('response', (response) => {
    if (response.status() >= 400)
      raw.push(
        `http ${response.status()}: ${response.request().method()} ${response.url().split('?')[0]}`,
      )
  })
  // gapi (loaded by the Auth SDK's popup resolver from apis.google.com) pings
  // https://apis.google.com/js/gen_204 now and then; postbuild's connect-src
  // does not list it, so Chrome logs two CSP lines. Google's telemetry, not
  // the app's: dropped here, and reported (it would show in production too).
  const noise = /apis\.google\.com\/js\/gen_204/
  return {
    page,
    get errors() {
      return raw.filter((line) => !noise.test(line))
    },
  }
}

interface SyncFixtures {
  /** Fresh emulators for every test. */
  emulators: undefined
  /** Opens another device (browser context); closed after the test. */
  device: () => Promise<Device>
}

export const test = base.extend<SyncFixtures>({
  emulators: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads the fixture's dependencies from this pattern.
    async ({}, use) => {
      await resetEmulators()
      await use(undefined)
    },
    { auto: true },
  ],
  device: async ({ browser, baseURL }, use) => {
    const opened: Device[] = []
    await use(async () => {
      const device = await openDevice(browser, baseURL as string)
      opened.push(device)
      return device
    })
    await Promise.all(opened.map((device) => device.page.context().close()))
  },
})

export { expect }

const PRAYERS = ['Fajr', "Jumu'ah", 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
export type Prayer = (typeof PRAYERS)[number]

/** Welcome → … → Start, choosing a city by search (no geolocation permission). */
export async function onboard(page: Page, city = 'London'): Promise<void> {
  const o = en.onboarding
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/welcome$/)
  await page.getByRole('button', { name: o.continue, exact: true }).click()
  await expect(page).toHaveURL(/\/onboarding\/how$/)
  await page.getByRole('button', { name: o.continue, exact: true }).click()
  await expect(page).toHaveURL(/\/onboarding\/location$/)
  await page.getByRole('textbox', { name: 'Search for a city' }).fill(city)
  await page
    .getByRole('button', { name: new RegExp(`^${city} `) })
    .first()
    .click()
  await page.getByRole('button', { name: o.continue, exact: true }).click()
  await expect(page).toHaveURL(/\/onboarding\/you$/)
  await page.getByRole('button', { name: o.continue, exact: true }).click()
  await expect(page).toHaveURL(/\/onboarding\/reminders$/)
  await page.getByRole('button', { name: o.notNow, exact: true }).click()
  await expect(page).toHaveURL(/\/onboarding\/start$/)
  await page.getByRole('button', { name: o.done, exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
}

export function prayer(page: Page, name: Prayer): Locator {
  return page.getByRole('main').getByRole('checkbox', { name, exact: true })
}

/** Ticks (or unticks) a prayer on Today and waits for the box to show it. */
export async function setPrayer(page: Page, name: Prayer, checked: boolean): Promise<void> {
  const box = prayer(page, name)
  await expect(box).toBeChecked({ checked: !checked })
  await box.click()
  await expect(box).toBeChecked({ checked })
}

export async function openAccount(page: Page): Promise<void> {
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: en.account.title, level: 1 })).toBeVisible()
}

/** Presses "Sign in with Google" (or Apple) and completes the emulator popup as `email`. */
export async function signIn(
  page: Page,
  email: string,
  provider: 'Google' | 'Apple' = 'Google',
  options?: PopupOptions,
): Promise<void> {
  const label = provider === 'Google' ? en.account.signInWithGoogle : en.account.signInWithApple
  await withPopup(
    page,
    () => page.getByRole('button', { name: label, exact: true }).click(),
    email,
    options,
  )
}

/** The Account screen shows the email and "Up to date" after a finished sync. */
export async function expectSynced(page: Page, email: string): Promise<void> {
  const main = page.getByRole('main')
  // On a wide window the More list beside the screen shows the email too; the screen's copy is last.
  await expect(main.getByText(email, { exact: true }).last()).toBeVisible()
  await expect(main.getByText(/^Last synced /)).toBeVisible()
  await expect(main.getByText(en.account.upToDate, { exact: true })).toBeVisible()
}

/** What the app does when it comes back to the foreground (apps/companion/src/cloud.ts). */
export async function foreground(page: Page): Promise<void> {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
}

/** The device's local store (localStorage key ihsaanly.db.v1, packages/state storage/backend.web.ts). */
export async function localDb(page: Page): Promise<{
  preferences: Record<string, string>
  events: { kind: string; subject: string; at: number; logDay: string; synced: boolean }[]
} | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('ihsaanly.db.v1')
    return raw ? JSON.parse(raw) : null
  })
}

/** Opens the sign-out question and picks keep or remove. */
export async function signOut(page: Page, mode: 'keep' | 'remove'): Promise<void> {
  const a = en.account
  await page.getByText(a.signOut, { exact: true }).click()
  await expect(page.getByText(a.signOutTitle)).toBeVisible()
  await page.getByRole('button', { name: mode === 'keep' ? a.keepData : a.removeData }).click()
}
