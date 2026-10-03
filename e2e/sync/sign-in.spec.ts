// Journeys 1 and 2: the first device signs in and uploads; a second device
// restores from the welcome screen without going through setup.
import { en } from '@ihsaanly/core/strings/en'
import {
  expect,
  expectSynced,
  localDb,
  onboard,
  prayer,
  setPrayer,
  signIn,
  test,
} from './support/device.ts'
import { remoteMonths } from './support/journeys.ts'
import { getDoc, listDocs, uidOf } from './support/rest.ts'

const A = 'a@test.dev'

test('device A signs in and uploads its marks; device B restores them', async ({ device }) => {
  const a = await device()
  await onboard(a.page)
  await setPrayer(a.page, 'Fajr', true)
  await setPrayer(a.page, 'Asr', true)

  // Home for the geofence (set to the current place, at full precision): the
  // `events` preference, which must never leave the device.
  await a.page.goto('/events')
  await a.page.getByText(en.events.setHome, { exact: true }).click()
  await expect
    .poll(async () => (await localDb(a.page))?.preferences.events ?? '')
    .toContain('"home"')

  // More → Account → Sign in with Google.
  await a.page.getByRole('link', { name: en.tabs.more, exact: true }).click()
  await a.page
    .getByRole('link', { name: new RegExp(`^${en.account.title} `) })
    .first()
    .click()
  await expect(a.page).toHaveURL(/\/account$/)
  await signIn(a.page, A)
  await expectSynced(a.page, A)
  await expect(a.page.getByText(en.account.signedInWith.google, { exact: true })).toBeVisible()

  // What reached Firestore.
  const uid = await uidOf(A)
  const local = await localDb(a.page)
  const marks = (local?.events ?? []).filter((event) => event.kind === 'prayer-performed')
  expect(marks.map((event) => event.subject).sort()).toEqual(['asr', 'fajr'])
  const month = (marks[0]?.logDay ?? '').slice(0, 7)
  // Layout 2: one `sync` collection holds the months and the preferences,
  // with readable field names; the profile is written once.
  const { doc: profile } = await getDoc(`users/${uid}`)
  expect(Object.keys(profile?.data ?? {}).sort()).toEqual(['createdAt', 'schemaVersion'])
  expect(profile?.data.schemaVersion).toBe(2)
  const synced = await listDocs(`users/${uid}/sync`)
  expect(synced.map((doc) => doc.name.split('/').pop()).sort()).toEqual([month, 'preferences'])
  const months = await remoteMonths(uid)
  expect(months[0]?.data).toMatchObject({ type: 'events', month })
  const entries = months[0]?.data.events as Record<
    string,
    { logDay: string; deltaSeconds: unknown }
  >
  for (const mark of marks) {
    const entry = entries[`${mark.at}|${mark.kind}|${mark.subject}`]
    expect(entry?.logDay).toBe(mark.logDay)
    expect(Object.keys(entry ?? {}).sort()).toEqual(['deltaSeconds', 'logDay'])
  }

  const { doc: preferencesDoc } = await getDoc(`users/${uid}/sync/preferences`)
  expect(preferencesDoc?.data.type).toBe('preferences')
  const preferences = preferencesDoc?.data.preferences as Record<
    string,
    { value: string; updatedAt: number }
  >
  expect(Object.keys(preferences)).not.toContain('events')
  expect(Object.keys(preferences)).toContain('onboarding')
  expect(typeof preferences.onboarding?.updatedAt).toBe('number')
  const place = JSON.parse(preferences.place?.value ?? 'null') as {
    latitude: number
    longitude: number
  }
  // London, Westminster from the city list: the synced copy is rounded to 2 decimals (~1 km).
  const localPlace = JSON.parse(local?.preferences.place ?? 'null') as typeof place
  expect(place.latitude).toBe(Math.round(localPlace.latitude * 100) / 100)
  expect(place.longitude).toBe(Math.round(localPlace.longitude * 100) / 100)
  expect(String(place.latitude).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  expect(String(place.longitude).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  expect(a.errors).toEqual([])

  // Device B: welcome → "Already use Ihsaanly?" → same account → Today, no setup.
  const b = await device()
  await b.page.goto('/')
  await expect(b.page).toHaveURL(/\/onboarding\/welcome$/)
  await b.page.getByRole('button', { name: en.onboarding.restore }).click()
  await expect(b.page).toHaveURL(/\/account\?from=onboarding$/)
  await expect(b.page.getByText(en.account.restore.intro)).toBeVisible()
  await signIn(b.page, A)
  await expect(b.page).toHaveURL(/\/today$/)
  await expect(prayer(b.page, 'Fajr')).toBeChecked()
  await expect(prayer(b.page, 'Asr')).toBeChecked()
  await expect(prayer(b.page, 'Maghrib')).not.toBeChecked()
  await expect(b.page.getByRole('main').getByText(/· London$/)).toBeVisible()
  // The home coordinates stayed on device A.
  expect((await localDb(b.page))?.preferences.events).toBeUndefined()
  // Setup is done on B too: the onboarding URL sends it back to Today.
  await b.page.goto('/onboarding/welcome')
  await expect(b.page).toHaveURL(/\/today$/)
  expect(b.errors).toEqual([])
})
