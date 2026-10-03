// Talks to the emulators directly, as an admin (`Bearer owner` bypasses the
// rules) or as a signed-in user (their ID token, so the rules apply).
import { AUTH_URL, FIRESTORE_URL, PROJECT } from './env.ts'

const OWNER = { Authorization: 'Bearer owner' }
const DOCUMENTS = `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents`

/** Empties both emulators: every document and every Auth account. */
export async function resetEmulators(): Promise<void> {
  const urls = [
    `${FIRESTORE_URL}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    `${AUTH_URL}/emulator/v1/projects/${PROJECT}/accounts`,
  ]
  for (const url of urls) {
    // The Auth emulator can answer a moment before Firestore does on a cold start.
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, { method: 'DELETE' }).catch((error: unknown) => {
        if (attempt >= 30) throw error
        return null
      })
      if (response?.ok) break
      if (response) throw new Error(`DELETE ${url}: ${response.status}`)
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  }
}

export interface EmulatorAccount {
  localId: string
  email?: string
  providerUserInfo?: { providerId: string; email?: string }[]
}

/** Every Auth account in the emulator. */
export async function accounts(): Promise<EmulatorAccount[]> {
  const response = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`,
    { method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' }, body: '{}' },
  )
  const body = (await response.json()) as { userInfo?: EmulatorAccount[] }
  return body.userInfo ?? []
}

/** The uid of the Auth account with this email. */
export async function uidOf(email: string): Promise<string> {
  const found = (await accounts()).find((account) => account.email === email)
  if (!found) throw new Error(`No emulator account for ${email}`)
  return found.localId
}

/** Firestore's REST value encoding, decoded to plain JSON. */
type Value = Record<string, unknown>
function decode(value: Value): unknown {
  if ('mapValue' in value)
    return decodeFields((value.mapValue as { fields?: Record<string, Value> }).fields)
  if ('arrayValue' in value)
    return ((value.arrayValue as { values?: Value[] }).values ?? []).map(decode)
  if ('integerValue' in value) return Number(value.integerValue)
  if ('nullValue' in value) return null
  const [only] = Object.values(value)
  return only
}
function decodeFields(fields: Record<string, Value> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]))
}

export interface Doc {
  name: string
  data: Record<string, unknown>
}

/** GET a document as admin, or with `token` (an ID token) so the rules apply. Returns the status too. */
export async function getDoc(
  path: string,
  token = 'owner',
): Promise<{ status: number; doc: Doc | null }> {
  const response = await fetch(`${DOCUMENTS}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return { status: response.status, doc: null }
  const body = (await response.json()) as { name: string; fields?: Record<string, Value> }
  return { status: response.status, doc: { name: body.name, data: decodeFields(body.fields) } }
}

/** Every document in a collection, as admin. */
export async function listDocs(collection: string): Promise<Doc[]> {
  const response = await fetch(`${DOCUMENTS}/${collection}`, { headers: OWNER })
  if (!response.ok) throw new Error(`GET ${collection}: ${response.status}`)
  const body = (await response.json()) as {
    documents?: { name: string; fields?: Record<string, Value> }[]
  }
  return (body.documents ?? []).map((doc) => ({ name: doc.name, data: decodeFields(doc.fields) }))
}

/** Plain JSON in Firestore's REST value encoding (strings, integers, null, maps). */
function encode(value: unknown): Value {
  if (value === null) return { nullValue: null }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'string') return { stringValue: value }
  return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } }
}
function encodeFields(data: Record<string, unknown>): Record<string, Value> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]))
}

/** Writes a document as admin, past the rules (seeding data an older client left). */
export async function setDocAsAdmin(path: string, data: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${DOCUMENTS}/${path}`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(data) }),
  })
  if (!response.ok) throw new Error(`PATCH ${path}: ${response.status}`)
}

/** A fresh email/password user, straight through the Auth REST API: its uid and ID token. */
export async function signUp(email: string): Promise<{ uid: string; idToken: string }> {
  const response = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
    },
  )
  const body = (await response.json()) as { localId: string; idToken: string }
  if (!response.ok) throw new Error(`signUp ${email}: ${JSON.stringify(body)}`)
  return { uid: body.localId, idToken: body.idToken }
}

/**
 * Sets one key of `users/{uid}/sync/preferences` as admin, the way a device's
 * push leaves it: the other keys kept, `updatedAt` the server's time (which
 * the pull cursor and the live listener go by).
 */
export async function setPreferenceAsAdmin(
  uid: string,
  key: string,
  value: string,
  updatedAt: number,
): Promise<void> {
  const root = `projects/${PROJECT}/databases/(default)/documents`
  const response = await fetch(`${FIRESTORE_URL}/v1/${root}:commit`, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `${root}/users/${uid}/sync/preferences`,
            fields: encodeFields({
              type: 'preferences',
              preferences: { [key]: { value, updatedAt } },
            }),
          },
          // Backticks: the key holds ':', which a bare field path cannot.
          updateMask: { fieldPaths: ['type', `preferences.\`${key}\``] },
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`commit ${key}: ${response.status} ${await response.text()}`)
}
