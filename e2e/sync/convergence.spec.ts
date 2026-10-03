// Journey 3: two devices on one account converge — a mark travels B → A on
// foreground, an unmark travels A → B on reopen.
import { expect, foreground, prayer, setPrayer, test } from './support/device.ts'
import { expectRemoteEvent, firstDevice, restoreDevice, toToday } from './support/journeys.ts'
import { uidOf } from './support/rest.ts'

const A = 'a@test.dev'

test('a mark on one device reaches the other, and so does an unmark', async ({ device }) => {
  const a = await device()
  const b = await device()
  await firstDevice(a, A, ['Fajr'])
  await restoreDevice(b, A)
  const uid = await uidOf(A)
  await toToday(a.page)
  await expect(prayer(a.page, 'Asr')).not.toBeChecked()

  // B marks Asr; its debounced push lands; A comes to the foreground and pulls it.
  await setPrayer(b.page, 'Asr', true)
  await expectRemoteEvent(uid, 'prayer-performed', 'asr')
  await foreground(a.page)
  await expect(prayer(a.page, 'Asr')).toBeChecked()
  await expect(prayer(a.page, 'Fajr')).toBeChecked()

  // A takes it back; B is reopened (a reload restores the session and syncs).
  await setPrayer(a.page, 'Asr', false)
  await expectRemoteEvent(uid, 'prayer-unmarked', 'asr')
  await b.page.reload()
  await expect(prayer(b.page, 'Asr')).not.toBeChecked()
  await expect(prayer(b.page, 'Fajr')).toBeChecked()

  expect(a.errors).toEqual([])
  expect(b.errors).toEqual([])
})
