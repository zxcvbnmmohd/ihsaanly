// Runs against the Firestore emulator: `bun run test:rules`.
import { afterAll, beforeAll, beforeEach, describe, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  type FieldValue,
  type Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  const [host = '127.0.0.1', port = '8080'] = (process.env.FIRESTORE_EMULATOR_HOST ?? '').split(':')
  env = await initializeTestEnvironment({
    projectId: 'demo-ihsaanly',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host,
      port: Number(port),
    },
  })
})

beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

// The compat instance the harness hands out works with modular calls.
const as = (uid: string): Firestore =>
  env.authenticatedContext(uid).firestore() as unknown as Firestore
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore

const month = (
  events: Record<string, unknown> = { '1|prayer|fajr': { l: '2025-10-09', d: null } },
): { events: Record<string, unknown>; updatedAt: FieldValue } => ({
  events,
  updatedAt: serverTimestamp(),
})
const prefs = (count = 1): { prefs: Record<string, unknown>; updatedAt: FieldValue } => ({
  prefs: Object.fromEntries(Array.from({ length: count }, (_, i) => [`k${i}`, { v: '1', t: 1 }])),
  updatedAt: serverTimestamp(),
})

describe('owner', () => {
  test('writes, reads and deletes all three doc types', async () => {
    const db = as('alice')
    await assertSucceeds(
      setDoc(doc(db, 'users/alice'), { createdAt: serverTimestamp(), schema: 1 }),
    )
    await assertSucceeds(setDoc(doc(db, 'users/alice/eventMonths/2025-10'), month()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/state/preferences'), prefs()))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/state/preferences')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/state/preferences')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice')))
  })

  test('appends events to a month with merge', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice/eventMonths/2025-10')
    await setDoc(ref, month())
    await assertSucceeds(
      setDoc(ref, month({ '2|prayer|dhuhr': { l: '2025-10-09', d: 60 } }), { merge: true }),
    )
  })
})

describe('denied', () => {
  test('another uid cannot read or write', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore() as unknown as Firestore, 'users/alice/eventMonths/2025-10'), {
        events: {},
        updatedAt: Timestamp.now(),
      }),
    )
    const db = as('mallory')
    await assertFails(getDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertFails(setDoc(doc(db, 'users/alice/eventMonths/2025-11'), month()))
    await assertFails(setDoc(doc(db, 'users/alice'), { createdAt: serverTimestamp(), schema: 1 }))
  })

  test('unauthenticated cannot read or write', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice')))
    await assertFails(setDoc(doc(anon(), 'users/alice/eventMonths/2025-10'), month()))
  })

  test('extra fields', async () => {
    const db = as('alice')
    await assertFails(
      setDoc(doc(db, 'users/alice'), { createdAt: serverTimestamp(), schema: 1, x: 1 }),
    )
    await assertFails(setDoc(doc(db, 'users/alice/eventMonths/2025-10'), { ...month(), x: 1 }))
    await assertFails(setDoc(doc(db, 'users/alice/state/preferences'), { ...prefs(), x: 1 }))
  })

  test('non-integer schema', async () => {
    await assertFails(
      setDoc(doc(as('alice'), 'users/alice'), { createdAt: serverTimestamp(), schema: '1' }),
    )
  })

  test('removing an event key on update', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice/eventMonths/2025-10')
    await setDoc(ref, month())
    await assertFails(setDoc(ref, month({ '2|prayer|dhuhr': { l: '2025-10-09', d: null } })))
  })

  test('bad month id', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users/alice/eventMonths/2025-1'), month()))
    await assertFails(setDoc(doc(as('alice'), 'users/alice/eventMonths/oct'), month()))
  })

  test('updatedAt that is not request.time', async () => {
    const db = as('alice')
    await assertFails(
      setDoc(doc(db, 'users/alice/eventMonths/2025-10'), {
        ...month(),
        updatedAt: Timestamp.now(),
      }),
    )
    await assertFails(
      setDoc(doc(db, 'users/alice/state/preferences'), { ...prefs(), updatedAt: Timestamp.now() }),
    )
  })

  test('more than 64 preferences', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice/state/preferences'), prefs(64)))
    await assertFails(setDoc(doc(db, 'users/alice/state/preferences'), prefs(65)))
  })

  test('state docs other than preferences, and unknown collections', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/state/other'), prefs()))
    await assertFails(setDoc(doc(db, 'users/alice/notes/1'), { x: 1 }))
    await assertFails(setDoc(doc(db, 'elsewhere/alice'), { x: 1 }))
    await assertFails(getDoc(doc(db, 'elsewhere/alice')))
  })
})
