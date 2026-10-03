// Journey: a device that is open hears the account live (a Firestore
// listener, packages/cloud firebase/sync-remote.ts `watch`), with no reload,
// no foreground and no pull. Item progress (`progress:<itemId>`) is the case
// that needs it: a count started on one device carries on on the other.
//
// The first journey writes straight to the account, shaped as a device's
// push leaves it; the second drives Today's counter on two devices.
import { en } from '@ihsaanly/core/strings/en'
import type { Page } from '@playwright/test'
import { FIXED_NOW } from '../support/clock.ts'
import { expect, localDb, test } from './support/device.ts'
import { firstDevice, restoreDevice, toToday } from './support/journeys.ts'
import { setPreferenceAsAdmin, uidOf } from './support/rest.ts'

const A = 'a@test.dev'

test('item progress written elsewhere reaches an open device within seconds, without a reload', async ({
  device,
}) => {
  const b = await device()
  await firstDevice(b, A, [])
  const uid = await uidOf(A)

  const value = JSON.stringify({
    periodKey: '2026-10-03:morning',
    count: 12,
    parts: [],
    updatedAt: Date.now(),
  })
  await setPreferenceAsAdmin(uid, 'progress:tasbih', value, Date.now())

  await expect
    .poll(async () => (await localDb(b.page))?.preferences['progress:tasbih'], {
      message: 'progress:tasbih on the open device',
      timeout: 3_000,
    })
    .toBe(value)

  expect(b.errors).toEqual([])
})

const TASBIH = 'Tasbih after prayer'

/** Dismisses the first-run tour if this Today shows it. */
async function skipTourIfShown(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: en.tour.skip, exact: true })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function count(page: Page, from: number, to: number): Promise<void> {
  const panel = page.getByRole('dialog', { name: TASBIH })
  for (let at = from; at < to; at += 1) {
    await panel.getByRole('button', { name: en.today.countItem(TASBIH, at, 33) }).click()
  }
}

test('a count started on one device carries on on the other, and finishing it there reaches the first', async ({
  device,
}) => {
  const a = await device()
  const b = await device()
  // The tasbih after prayer is on Today only after a prayer: pin both to 13:30 London.
  for (const { page } of [a, b]) await page.clock.setFixedTime(FIXED_NOW)
  await firstDevice(a, A, ['Dhuhr'])
  await restoreDevice(b, A)
  await toToday(a.page)
  await skipTourIfShown(a.page)
  await skipTourIfShown(b.page)

  // A counts to 12 and puts it down; B, open on Today, shows 12/33 with no reload.
  // It is both Right now and after Asr in Up next: either circle counts.
  await a.page
    .getByRole('button', { name: en.today.countItem(TASBIH, 0, 33) })
    .first()
    .click()
  await count(a.page, 0, 12)
  await a.page.getByRole('button', { name: en.panel.close }).click()
  const onB = b.page.getByRole('button', { name: en.today.countItem(TASBIH, 12, 33) }).first()
  await expect(onB).toBeVisible({ timeout: 10_000 })

  // B finishes it; A hears the completion live and moves it to Done today.
  await onB.click()
  await count(b.page, 12, 33)
  await expect(b.page.getByRole('button', { name: en.today.doneToday(1) })).toBeVisible()
  await expect(a.page.getByRole('button', { name: en.today.doneToday(1) })).toBeVisible({
    timeout: 20_000,
  })

  expect(a.errors).toEqual([])
  expect(b.errors).toEqual([])
})
