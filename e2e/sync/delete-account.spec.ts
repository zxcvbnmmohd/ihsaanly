// Journey 6: deleting the account re-authenticates (emulator popup), erases
// users/{uid}/** and the Auth user, then keeps or removes the device's copy.
import { en } from '@ihsaanly/core/strings/en'
import type { Page } from '@playwright/test'
import { expect, localDb, prayer, test } from './support/device.ts'
import { firstDevice, toToday } from './support/journeys.ts'
import { withPopup } from './support/popup.ts'
import { accounts, getDoc, listDocs, setDocAsAdmin, uidOf } from './support/rest.ts'

const A = 'a@test.dev'

async function deleteAccount(page: Page, mode: 'keep' | 'remove'): Promise<void> {
  const a = en.account
  // Choosing keep/remove starts the deletion, which first asks the provider again (the popup).
  await withPopup(
    page,
    async () => {
      await page.getByText(a.deleteAccount, { exact: true }).click()
      await expect(page.getByText(a.deleteTitle)).toBeVisible()
      // The row is "Delete account <detail>"; the confirm button is exactly "Delete account".
      await page.getByRole('button', { name: a.deleteConfirm, exact: true }).click()
      await expect(page.getByText(a.deleteChoiceTitle)).toBeVisible()
      await page.getByRole('button', { name: mode === 'keep' ? a.keepData : a.removeData }).click()
    },
    A,
  )
}

async function expectGoneFromCloud(uid: string): Promise<void> {
  await expect.poll(async () => (await accounts()).length).toBe(0)
  expect((await getDoc(`users/${uid}`)).status).toBe(404)
  expect(await listDocs(`users/${uid}/sync`)).toEqual([])
  // Layout 1's documents go too.
  expect((await getDoc(`users/${uid}/state/preferences`)).status).toBe(404)
  expect(await listDocs(`users/${uid}/eventMonths`)).toEqual([])
}

/** What a layout-1 client would have left in the account. */
async function seedLayout1(uid: string): Promise<void> {
  await setDocAsAdmin(`users/${uid}/eventMonths/2025-10`, {
    events: { '1|prayer-performed|fajr': { l: '2025-10-09', d: null } },
  })
  await setDocAsAdmin(`users/${uid}/state/preferences`, { prefs: { theme: { v: '1', t: 1 } } })
}

test('delete account, keep this device’s data', async ({ device }) => {
  const one = await device()
  await firstDevice(one, A, ['Fajr'])
  const uid = await uidOf(A)
  expect((await getDoc(`users/${uid}/sync/preferences`)).status).toBe(200)
  await seedLayout1(uid)

  await deleteAccount(one.page, 'keep')
  await expect(one.page.getByRole('button', { name: en.account.signInWithGoogle })).toBeVisible()
  await expectGoneFromCloud(uid)

  // Local-only from here: the marks are still on Today.
  await toToday(one.page)
  await expect(prayer(one.page, 'Fajr')).toBeChecked()
  expect((await localDb(one.page))?.events.some((event) => event.subject === 'fajr')).toBe(true)
  expect(one.errors).toEqual([])
})

test('delete account, remove this device’s data', async ({ device }) => {
  const one = await device()
  await firstDevice(one, A, ['Fajr'])
  const uid = await uidOf(A)
  await seedLayout1(uid)

  await deleteAccount(one.page, 'remove')
  // Wiped and reloaded: before setup, /account is the restore screen.
  await expect(one.page).toHaveURL(/\/account\?from=onboarding$/)
  await expectGoneFromCloud(uid)
  const wiped = await localDb(one.page)
  expect(wiped?.events ?? []).toEqual([])
  expect(wiped?.preferences.onboarding).toBeUndefined()
  expect(one.errors).toEqual([])
})
