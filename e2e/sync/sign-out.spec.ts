// Journey 4: signing out keeps or removes this device's copy; the account's
// copy stays in the cloud either way, and signing back in restores it.
import { en } from '@ihsaanly/core/strings/en'
import {
  expect,
  expectSynced,
  localDb,
  openAccount,
  prayer,
  signIn,
  signOut,
  test,
} from './support/device.ts'
import { firstDevice, remoteEventKeys, restoreDevice, toToday } from './support/journeys.ts'
import { uidOf } from './support/rest.ts'

const A = 'a@test.dev'

test('sign out: keep leaves the data, remove wipes it, the cloud keeps it', async ({ device }) => {
  const a = await device()
  await firstDevice(a, A, ['Fajr', 'Maghrib'])
  const uid = await uidOf(A)
  const signInButton = a.page.getByRole('button', { name: en.account.signInWithGoogle })

  // Keep: signed out, but Today still has the marks.
  await signOut(a.page, 'keep')
  await expect(signInButton).toBeVisible()
  await expect(
    a.page
      .getByRole('link', { name: new RegExp(`^${en.account.title} ${en.account.notSignedIn}`) })
      .first(),
  ).toBeVisible()
  await toToday(a.page)
  await expect(prayer(a.page, 'Fajr')).toBeChecked()
  await expect(prayer(a.page, 'Maghrib')).toBeChecked()

  // Back in (same account: no question asked), then out again with remove.
  await openAccount(a.page)
  await signIn(a.page, A)
  await expectSynced(a.page, A)
  await expect(a.page.getByText(en.account.mismatchTitle)).toHaveCount(0)
  await signOut(a.page, 'remove')
  // The app reloads from scratch with nothing on the device. Still on /account,
  // which before setup is the restore screen, with the way back to setup.
  await expect(a.page).toHaveURL(/\/account\?from=onboarding$/)
  await expect(a.page.getByRole('button', { name: en.account.restore.backToSetup })).toBeVisible()
  const wiped = await localDb(a.page)
  expect(wiped?.events ?? []).toEqual([])
  expect(wiped?.preferences.onboarding).toBeUndefined()

  // The account still has everything.
  const keys = await remoteEventKeys(uid)
  expect(keys.some((key) => key.endsWith('|prayer-performed|fajr'))).toBe(true)
  expect(keys.some((key) => key.endsWith('|prayer-performed|maghrib'))).toBe(true)

  // And signing back in brings it back.
  await restoreDevice(a, A)
  await expect(prayer(a.page, 'Fajr')).toBeChecked()
  await expect(prayer(a.page, 'Maghrib')).toBeChecked()
  expect(a.errors).toEqual([])
})
