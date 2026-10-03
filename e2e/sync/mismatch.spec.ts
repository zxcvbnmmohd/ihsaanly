// Journey 5: a device holding account A's data signs in to account B and is
// asked what to do with it — merge it into B, or start fresh with B's.
import { en } from '@ihsaanly/core/strings/en'
import {
  type Device,
  expect,
  expectSynced,
  openAccount,
  prayer,
  signIn,
  signOut,
  test,
} from './support/device.ts'
import { firstDevice, remoteEventKeys, toToday } from './support/journeys.ts'
import { uidOf } from './support/rest.ts'

const A = 'a@test.dev'
const B = 'b@test.dev'

const has = (keys: string[], subject: string): boolean =>
  keys.some((key) => key.endsWith(`|prayer-performed|${subject}`))

/** Device 1 holds A's data (Fajr), signed out with keep; B's account has Isha from device 2. Ends at the question. */
async function mismatched(device: () => Promise<Device>): Promise<Device> {
  const one = await device()
  await firstDevice(one, A, ['Fajr'])
  await signOut(one.page, 'keep')
  await expect(one.page.getByRole('button', { name: en.account.signInWithGoogle })).toBeVisible()

  const two = await device()
  await firstDevice(two, B, ['Isha'])
  await two.page.context().close()

  await signIn(one.page, B)
  await expect(one.page.getByText(en.account.mismatchTitle)).toBeVisible()
  await expect(one.page.getByText(en.account.mismatchBody)).toBeVisible()
  // Nothing moved while the question is open.
  expect(has(await remoteEventKeys(await uidOf(B)), 'fajr')).toBe(false)
  return one
}

test('merge into this account: the device’s data joins B’s', async ({ device }) => {
  const one = await mismatched(device)
  await one.page.getByRole('button', { name: en.account.merge }).click()
  await expectSynced(one.page, B)
  await expect(one.page.getByText(en.account.mismatchTitle)).toHaveCount(0)

  const bKeys = await remoteEventKeys(await uidOf(B))
  expect(has(bKeys, 'fajr')).toBe(true)
  expect(has(bKeys, 'isha')).toBe(true)
  // A's account is untouched by the merge.
  expect(has(await remoteEventKeys(await uidOf(A)), 'isha')).toBe(false)

  await toToday(one.page)
  await expect(prayer(one.page, 'Fajr')).toBeChecked()
  await expect(prayer(one.page, 'Isha')).toBeChecked()
  expect(one.errors).toEqual([])
})

test('start fresh: the device drops A’s data and takes B’s', async ({ device }) => {
  const one = await mismatched(device)
  await one.page.getByRole('button', { name: en.account.fresh }).click()
  await expectSynced(one.page, B)
  await expect(one.page.getByText(en.account.mismatchTitle)).toHaveCount(0)

  const bKeys = await remoteEventKeys(await uidOf(B))
  expect(has(bKeys, 'fajr')).toBe(false)
  expect(has(bKeys, 'isha')).toBe(true)
  // A keeps its own copy in the cloud.
  expect(has(await remoteEventKeys(await uidOf(A)), 'fajr')).toBe(true)

  await toToday(one.page)
  await expect(prayer(one.page, 'Isha')).toBeChecked()
  await expect(prayer(one.page, 'Fajr')).not.toBeChecked()
  // Still set up (B's onboarding came with the sync), and still signed in after a reload.
  await openAccount(one.page)
  await expectSynced(one.page, B)
  expect(one.errors).toEqual([])
})
