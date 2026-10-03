// Journey 7: the deployed rules hold end to end. With another user's ID
// token, the Firestore REST API refuses account A's documents.
import { expect, test } from './support/device.ts'
import { FIRESTORE_URL, PROJECT } from './support/env.ts'
import { firstDevice } from './support/journeys.ts'
import { getDoc, signUp, uidOf } from './support/rest.ts'

const A = 'a@test.dev'

test('user B cannot read or write user A’s data', async ({ device }) => {
  const one = await device()
  await firstDevice(one, A, ['Fajr'])
  const uidA = await uidOf(A)
  const b = await signUp('b@test.dev')
  const month = (await (async () => {
    const response = await fetch(
      `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uidA}/eventMonths`,
      { headers: { Authorization: 'Bearer owner' } },
    )
    const body = (await response.json()) as { documents: { name: string }[] }
    return body.documents[0]?.name.split('/').pop()
  })()) as string

  for (const path of [
    `users/${uidA}`,
    `users/${uidA}/state/preferences`,
    `users/${uidA}/eventMonths/${month}`,
  ]) {
    // Admin sees it (the data is there), B is refused, and so is no token at all.
    expect((await getDoc(path)).status, `admin ${path}`).toBe(200)
    expect((await getDoc(path, b.idToken)).status, `B reads ${path}`).toBe(403)
    const anonymous = await fetch(
      `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    )
    expect(anonymous.status, `anonymous reads ${path}`).toBe(403)
  }

  // Listing A's months, and writing into A's subtree, are refused too.
  const documents = `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents`
  const list = await fetch(`${documents}/users/${uidA}/eventMonths`, {
    headers: { Authorization: `Bearer ${b.idToken}` },
  })
  expect(list.status).toBe(403)
  const write = await fetch(`${documents}/users/${uidA}/state/preferences`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${b.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { prefs: { mapValue: { fields: {} } } } }),
  })
  expect(write.status).toBe(403)

  // Control: B's token works for B's own (empty) subtree — not found, not forbidden.
  expect((await getDoc(`users/${b.uid}/state/preferences`, b.idToken)).status).toBe(404)
  expect(one.errors).toEqual([])
})
