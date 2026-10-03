// Google → Apple: the Auth emulator fakes apple.com too, so the
// one-account-per-email "link required" path runs end to end. A second device
// tries Apple for an email that already has a Google account, is told to
// continue with Google, and Apple is linked on the way in.
//
// The emulator only refuses (account-exists-with-different-credential) when the
// new identity's email is unverified; with a verified one it links silently,
// so the Apple popup is finished with `email_verified: false` (support/popup.ts).
// That is the Hide-My-Email-like case; a real Apple verified-email sign-in
// may behave differently in production and is not covered here.
import { en } from '@ihsaanly/core/strings/en'
import { expect, expectSynced, openAccount, prayer, signIn, test } from './support/device.ts'
import { firstDevice, toToday } from './support/journeys.ts'
import { accounts } from './support/rest.ts'

const A = 'a@test.dev'

test('signing in with Apple for a Google account links Apple to it', async ({ device }) => {
  const one = await device()
  await firstDevice(one, A, ['Fajr'])

  const two = await device()
  await two.page.goto('/')
  await two.page.getByRole('button', { name: en.onboarding.restore }).click()
  await signIn(two.page, A, 'Apple', { emailVerified: false })
  await expect(two.page.getByText(en.account.linkTitle)).toBeVisible()
  await expect(two.page.getByText(en.account.linkBody('Google', 'Apple'))).toBeVisible()
  await signIn(two.page, A, 'Google')
  await expect(two.page).toHaveURL(/\/today$/)
  await expect(prayer(two.page, 'Fajr')).toBeChecked()

  // One account, two providers.
  const all = await accounts()
  expect(all).toHaveLength(1)
  expect(all[0]?.providerUserInfo?.map((info) => info.providerId).sort()).toEqual([
    'apple.com',
    'google.com',
  ])
  await openAccount(two.page)
  await expectSynced(two.page, A)
  await expect(two.page.getByLabel(en.account.methodLinked('Apple'))).toBeVisible()
  await expect(two.page.getByLabel(en.account.methodLinked('Google'))).toBeVisible()
  await toToday(two.page)
  expect(two.errors).toEqual([])
})
