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
  collection,
  deleteDoc,
  doc,
  type FieldValue,
  type Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
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

// --- feedback -------------------------------------------------------------

const feedback = (
  uid = 'alice',
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  uid,
  kind: 'bug',
  message: 'The Asr window is an hour out',
  contactEmail: null,
  app: { surface: 'web', version: '1.0.0', locale: 'en', os: 'macOS 15' },
  diagnostics: null,
  createdAt: serverTimestamp(),
  status: 'new',
  ...overrides,
})

/** What the adapter sends: the feedback doc and the limit stamp, in one batch. */
function send(
  db: Firestore,
  data: Record<string, unknown> = feedback(),
  limitUid = 'alice',
  limit: Record<string, unknown> | null = { lastAt: serverTimestamp() },
): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'feedback')), data)
  if (limit) batch.set(doc(db, 'feedbackLimits', limitUid), limit)
  return batch.commit()
}

const seed = (path: string, data: Record<string, unknown>): Promise<void> =>
  env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore() as unknown as Firestore, path), data),
  )

describe('feedback', () => {
  test('an owner sends, with a contact email and diagnostics', async () => {
    await assertSucceeds(
      send(
        as('alice'),
        feedback('alice', {
          kind: 'idea',
          contactEmail: 'alice@example.test',
          diagnostics: { locale: 'en', failures: [], data: { days: 3 } },
        }),
      ),
    )
  })

  test('sends again once a minute has passed', async () => {
    await seed('feedbackLimits/alice', {
      lastAt: Timestamp.fromMillis(Date.now() - 61_000),
    })
    await assertSucceeds(send(as('alice')))
  })

  test('a second send within a minute is refused', async () => {
    const db = as('alice')
    await assertSucceeds(send(db))
    await assertFails(send(db))
  })

  test('a recent limit stamp refuses the send', async () => {
    await seed('feedbackLimits/alice', { lastAt: Timestamp.fromMillis(Date.now() - 30_000) })
    await assertFails(send(as('alice')))
  })

  test('without the limit doc in the batch', async () => {
    await assertFails(send(as('alice'), feedback(), 'alice', null))
    await seed('feedbackLimits/alice', { lastAt: Timestamp.fromMillis(Date.now() - 61_000) })
    await assertFails(send(as('alice'), feedback(), 'alice', null))
  })

  test("as another uid, or stamping someone else's limit", async () => {
    await assertFails(send(as('mallory'), feedback('alice'), 'mallory'))
    await assertFails(send(as('mallory'), feedback('alice'), 'alice'))
    await assertFails(send(as('mallory'), feedback('mallory'), 'alice'))
  })

  test('unauthenticated', async () => {
    await assertFails(send(anon()))
  })

  test('an extra or missing field', async () => {
    await assertFails(send(as('alice'), feedback('alice', { extra: 1 })))
    const { contactEmail: _, ...withoutEmail } = feedback()
    await assertFails(send(as('alice'), withoutEmail))
    await assertFails(
      send(
        as('alice'),
        feedback('alice', { app: { surface: 'web', version: '1', locale: 'en', os: 'x', y: 1 } }),
      ),
    )
  })

  test('an empty or oversize message, and a bad kind, email, surface or diagnostics', async () => {
    const db = as('alice')
    await assertFails(send(db, feedback('alice', { message: '' })))
    await assertFails(send(db, feedback('alice', { message: 'x'.repeat(5001) })))
    await assertFails(send(db, feedback('alice', { kind: 'rant' })))
    await assertFails(send(db, feedback('alice', { contactEmail: 'x'.repeat(255) })))
    await assertFails(
      send(db, feedback('alice', { app: { surface: 'tv', version: '1', locale: 'en', os: 'x' } })),
    )
    await assertFails(send(db, feedback('alice', { diagnostics: 'all of it' })))
    await assertFails(
      send(
        db,
        feedback('alice', {
          diagnostics: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, i])),
        }),
      ),
    )
    // The longest message is fine.
    await assertSucceeds(send(db, feedback('alice', { message: 'x'.repeat(5000) })))
  })

  test('a status other than new, or a client clock', async () => {
    await assertFails(send(as('alice'), feedback('alice', { status: 'done' })))
    await assertFails(send(as('alice'), feedback('alice', { createdAt: Timestamp.now() })))
    await assertFails(send(as('alice'), feedback(), 'alice', { lastAt: Timestamp.now() }))
  })

  test('no client reads, updates or deletes feedback, not even its author', async () => {
    await seed('feedback/f1', { ...feedback(), createdAt: Timestamp.now() })
    const db = as('alice')
    await assertFails(getDoc(doc(db, 'feedback/f1')))
    await assertFails(updateDoc(doc(db, 'feedback/f1'), { status: 'seen' }))
    await assertFails(deleteDoc(doc(db, 'feedback/f1')))
  })
})

describe('feedbackLimits', () => {
  test('the owner stamps it with the server time, but never reads or deletes it', async () => {
    const db = as('alice')
    const ref = doc(db, 'feedbackLimits/alice')
    await assertSucceeds(setDoc(ref, { lastAt: serverTimestamp() }))
    await assertSucceeds(setDoc(ref, { lastAt: serverTimestamp() }))
    await assertFails(getDoc(ref))
    await assertFails(deleteDoc(ref))
  })

  test('deleting the limit before a send does not dodge the 60 s window', async () => {
    const db = as('alice')
    await assertSucceeds(send(db))
    await assertFails(deleteDoc(doc(db, 'feedbackLimits/alice')))
    await assertFails(send(db))
  })

  test('nobody else, no client clock and no extra fields', async () => {
    await assertFails(
      setDoc(doc(as('mallory'), 'feedbackLimits/alice'), { lastAt: serverTimestamp() }),
    )
    await assertFails(setDoc(doc(anon(), 'feedbackLimits/alice'), { lastAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as('alice'), 'feedbackLimits/alice'), { lastAt: Timestamp.now() }))
    await assertFails(
      setDoc(doc(as('alice'), 'feedbackLimits/alice'), { lastAt: serverTimestamp(), x: 1 }),
    )
    await seed('feedbackLimits/alice', { lastAt: Timestamp.now() })
    await assertFails(deleteDoc(doc(as('mallory'), 'feedbackLimits/alice')))
  })
})
