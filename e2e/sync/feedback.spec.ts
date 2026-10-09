// Feedback reaches Firestore through the real rules: a signed-in device sends
// a report with diagnostics, the admin sees it in `feedback`, a second send
// inside the minute is refused, and no client may read the collection.
import { en } from '@ihsaanly/core/strings/en'
import type { Page } from '@playwright/test'
import { expect, expectSynced, onboard, openAccount, signIn, test } from './support/device.ts'
import { FIRESTORE_URL, PROJECT } from './support/env.ts'
import { listDocs, uidOf } from './support/rest.ts'

const A = 'a@test.dev'

/** The signed-in user's Firebase ID token, from the Auth SDK's persisted session. */
async function idToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const fromUser = (user: unknown): string | null =>
      (user as { stsTokenManager?: { accessToken?: string } } | null)?.stsTokenManager
        ?.accessToken ?? null
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index) ?? ''
      if (key.startsWith('firebase:authUser:'))
        return fromUser(JSON.parse(localStorage.getItem(key) ?? 'null'))
    }
    return new Promise<string | null>((resolve) => {
      const open = indexedDB.open('firebaseLocalStorageDb')
      open.onerror = () => resolve(null)
      open.onsuccess = () => {
        const request = open.result
          .transaction('firebaseLocalStorage', 'readonly')
          .objectStore('firebaseLocalStorage')
          .getAll()
        request.onerror = () => resolve(null)
        request.onsuccess = () => {
          const rows = request.result as { fbase_key: string; value: unknown }[]
          const row = rows.find((entry) => entry.fbase_key.startsWith('firebase:authUser:'))
          resolve(fromUser(row?.value ?? null))
        }
      }
    })
  })
  if (!token) throw new Error('No Firebase ID token in the page')
  return token
}

test('a signed-in report lands in Firestore; a second within a minute is refused', async ({
  device,
}) => {
  const one = await device()
  const { page } = one
  await onboard(page)
  await openAccount(page)
  await signIn(page, A)
  await expectSynced(page, A)
  const uid = await uidOf(A)

  // More → Send feedback.
  await page.getByRole('link', { name: en.tabs.more, exact: true }).click()
  await page
    .getByRole('link', { name: new RegExp(`^${en.feedback.title}`) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/feedback$/)

  const main = page.getByRole('main')
  await main.getByRole('textbox', { name: en.feedback.messageLabel }).fill('The compass is off')
  await main.getByRole('switch', { name: en.feedback.includeDiagnostics }).click()
  await main.getByRole('button', { name: en.feedback.showIncluded }).click()
  await expect(main.getByText(/"eventCounts"/)).toBeVisible()
  await main.getByRole('button', { name: en.feedback.send, exact: true }).click()
  await expect(main.getByText(en.feedback.sentTitle, { exact: true })).toBeVisible()

  // What the admin sees.
  const docs = await listDocs('feedback')
  expect(docs).toHaveLength(1)
  const sent = docs[0]?.data ?? {}
  expect(sent).toMatchObject({
    uid,
    kind: 'bug',
    message: 'The compass is off',
    contactEmail: A,
    status: 'new',
    app: { surface: 'web', version: '1.0.0', locale: 'en-US' },
  })
  expect(typeof sent.createdAt).toBe('string')
  const diagnostics = sent.diagnostics as Record<string, unknown>
  expect(diagnostics.app).toMatchObject({ platform: 'web' })
  const data = diagnostics.data as Record<string, unknown>
  expect(Object.keys(data).sort()).toEqual(['days', 'eventCounts', 'preferences', 'trackedItems'])
  expect(JSON.stringify(diagnostics)).not.toContain('"events"')

  // Straight away again: the rules' one-minute limit, shown as a wait.
  await main.getByRole('button', { name: en.feedback.sendAnother }).click()
  await main.getByRole('textbox', { name: en.feedback.messageLabel }).fill('And another thing')
  await main.getByRole('button', { name: en.feedback.send, exact: true }).click()
  await expect(main.getByRole('alert')).toHaveText(en.feedback.errors['rate-limited'])
  expect(await listDocs('feedback')).toHaveLength(1)

  // No client reads feedback, not even its author.
  const token = await idToken(page)
  const documents = `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents`
  const list = await fetch(`${documents}/feedback`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(list.status).toBe(403)
  const read = await fetch(`${FIRESTORE_URL}/v1/${docs[0]?.name}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(read.status).toBe(403)

  // The refused send logs nothing. Firestore's WebChannel sometimes probes
  // www.google.com/images/cleardot.gif for connectivity, which the CSP does
  // not list: the SDK's, not the app's, like the gen_204 ping device.ts drops.
  expect(one.errors.filter((line) => !line.includes('/images/cleardot.gif'))).toEqual([])
})
