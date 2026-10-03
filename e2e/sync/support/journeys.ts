// Multi-step setups the specs share.
import { en } from '@ihsaanly/core/strings/en'
import type { Page } from '@playwright/test'
import {
  type Device,
  expect,
  expectSynced,
  onboard,
  openAccount,
  setPrayer,
  signIn,
} from './device.ts'
import { type Doc, listDocs } from './rest.ts'

/** Onboards, marks `prayers`, signs in as `email` and waits for the first sync. */
export async function firstDevice(
  device: Device,
  email: string,
  prayers: Parameters<typeof setPrayer>[1][],
): Promise<void> {
  await onboard(device.page)
  for (const name of prayers) await setPrayer(device.page, name, true)
  await openAccount(device.page)
  await signIn(device.page, email)
  await expectSynced(device.page, email)
}

/** A fresh device restoring `email` from the welcome screen; ends on Today. */
export async function restoreDevice(device: Device, email: string): Promise<void> {
  await device.page.goto('/')
  await device.page.getByRole('button', { name: en.onboarding.restore }).click()
  await signIn(device.page, email)
  await expect(device.page).toHaveURL(/\/today$/)
}

/** A user's month documents (`users/{uid}/sync/{YYYY-MM}`), without the preferences one. */
export async function remoteMonths(uid: string): Promise<Doc[]> {
  return (await listDocs(`users/${uid}/sync`)).filter((doc) => doc.data.type === 'events')
}

/** Every event key (`<at>|<kind>|<subject>`) in a user's month documents. */
export async function remoteEventKeys(uid: string): Promise<string[]> {
  const months = await remoteMonths(uid)
  return months.flatMap((doc) => Object.keys((doc.data.events ?? {}) as Record<string, unknown>))
}

/** Waits for the debounced push (5 s after a local write) to land an event of this kind and subject. */
export async function expectRemoteEvent(uid: string, kind: string, subject: string): Promise<void> {
  await expect
    .poll(
      async () => (await remoteEventKeys(uid)).some((key) => key.endsWith(`|${kind}|${subject}`)),
      {
        message: `${kind} ${subject} in Firestore`,
        timeout: 20_000,
      },
    )
    .toBe(true)
}

/** Client-side navigation to Today (no reload, so nothing but the trigger under test syncs). */
export async function toToday(page: Page): Promise<void> {
  await page.getByRole('link', { name: en.tabs.today, exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
}
