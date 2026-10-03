// Runs against the Firestore emulator: `bun run test:rules`.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
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
  deleteField,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  type Query,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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
/** Writes as an admin, past the rules. */
const seed = (path: string, data: Record<string, unknown>): Promise<void> =>
  env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore() as unknown as Firestore, path), data),
  )

const month = (
  events: Record<string, unknown> = {
    '1|prayer|fajr': { logDay: '2025-10-09', deltaSeconds: null },
  },
  id = '2025-10',
): Record<string, unknown> => ({
  type: 'events',
  month: id,
  events,
  updatedAt: serverTimestamp(),
})
const preferences = (count = 1): Record<string, unknown> => ({
  type: 'preferences',
  preferences: Object.fromEntries(
    Array.from({ length: count }, (_, i) => [`k${i}`, { value: '1', updatedAt: 1 }]),
  ),
  updatedAt: serverTimestamp(),
})
const profile = (): Record<string, unknown> => ({
  createdAt: serverTimestamp(),
  schemaVersion: 2,
})

/** The changed document ids of a listener's first `count` snapshots; `then` runs after the first. */
function firstSnapshots(
  source: Query,
  count: number,
  then: () => Promise<unknown>,
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const heard: string[][] = []
    const stop = onSnapshot(
      source,
      (snap) => {
        heard.push(snap.docChanges().map((change) => change.doc.id))
        if (heard.length === 1) then().catch(reject)
        if (heard.length === count) {
          stop()
          resolve(heard)
        }
      },
      reject,
    )
  })
}

describe('owner', () => {
  test('writes, reads and deletes the profile, a month and the preferences', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/sync/2025-10'), month()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/sync/preferences'), preferences()))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/sync/2025-10')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/sync/preferences')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/sync/2025-10')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/sync/preferences')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice')))
  })

  test('runs the pull query: everything in sync after a cursor, by updatedAt', async () => {
    const db = as('alice')
    await setDoc(doc(db, 'users/alice/sync/2025-10'), month())
    await setDoc(doc(db, 'users/alice/sync/preferences'), preferences())
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(db, 'users/alice/sync'),
          where('updatedAt', '>', Timestamp.fromMillis(0)),
          orderBy('updatedAt'),
        ),
      ),
    )
    expect(snap.docs.map((each) => each.id).sort()).toEqual(['2025-10', 'preferences'])
  })

  test('holds the pull query open as a listener (watch), and hears a later write', async () => {
    const db = as('alice')
    await setDoc(doc(db, 'users/alice/sync/preferences'), preferences())
    const changed = query(
      collection(db, 'users/alice/sync'),
      where('updatedAt', '>', Timestamp.fromMillis(0)),
      orderBy('updatedAt'),
    )
    const heard = await firstSnapshots(changed, 2, () =>
      setDoc(doc(db, 'users/alice/sync/2025-10'), month()),
    )
    expect(heard).toEqual([['preferences'], ['2025-10']])
  })

  test('deletes preference keys with a merge (finished item progress), keeping at most 64', async () => {
    const db = as('alice')
    const prefs = doc(db, 'users/alice/sync/preferences')
    await setDoc(prefs, preferences(64))
    await assertSucceeds(
      setDoc(
        prefs,
        {
          type: 'preferences',
          preferences: { k0: deleteField(), 'progress:x': { value: '{}', updatedAt: 2 } },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    )
    const snap = await getDoc(prefs)
    expect(Object.keys(snap.get('preferences'))).toHaveLength(64)
    expect(snap.get('preferences.k0')).toBeUndefined()
  })

  test('rewrites the profile idempotently, from another device or over a layout-1 one', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile()))
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile()))
    await seed('users/alice', { createdAt: Timestamp.now(), schema: 1 })
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile()))
  })

  test('appends events to a month with merge, and merges preferences', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice/sync/2025-10')
    await setDoc(ref, month())
    await assertSucceeds(
      setDoc(ref, month({ '2|prayer|dhuhr': { logDay: '2025-10-09', deltaSeconds: 60 } }), {
        merge: true,
      }),
    )
    const prefs = doc(db, 'users/alice/sync/preferences')
    await setDoc(prefs, preferences(2))
    await assertSucceeds(setDoc(prefs, preferences(1), { merge: true }))
  })

  test('reads and deletes layout-1 documents, but no longer writes them', async () => {
    await seed('users/alice/eventMonths/2025-10', { events: {}, updatedAt: Timestamp.now() })
    await seed('users/alice/state/preferences', { prefs: {}, updatedAt: Timestamp.now() })
    const db = as('alice')
    await assertSucceeds(getDocs(collection(db, 'users/alice/eventMonths')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/state/preferences')))
    await assertFails(
      setDoc(doc(db, 'users/alice/eventMonths/2025-10'), {
        events: {},
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      setDoc(doc(db, 'users/alice/eventMonths/2025-11'), {
        events: {},
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      setDoc(doc(db, 'users/alice/state/preferences'), { prefs: {}, updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/state/preferences')))
  })
})

describe('denied', () => {
  test('another uid cannot read, list or write', async () => {
    await seed('users/alice/sync/2025-10', { ...month(), updatedAt: Timestamp.now() })
    await seed('users/alice/eventMonths/2025-10', { events: {}, updatedAt: Timestamp.now() })
    const db = as('mallory')
    await assertFails(getDoc(doc(db, 'users/alice/sync/2025-10')))
    await assertFails(getDocs(collection(db, 'users/alice/sync')))
    await assertFails(getDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertFails(deleteDoc(doc(db, 'users/alice/eventMonths/2025-10')))
    await assertFails(deleteDoc(doc(db, 'users/alice/sync/2025-10')))
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-11'), month(undefined, '2025-11')))
    await assertFails(setDoc(doc(db, 'users/alice'), profile()))
  })

  test('another uid cannot listen to the sync collection', async () => {
    await seed('users/alice/sync/2025-10', { ...month(), updatedAt: Timestamp.now() })
    const db = as('mallory')
    const error = await new Promise<unknown>((resolve) => {
      onSnapshot(
        query(collection(db, 'users/alice/sync'), orderBy('updatedAt')),
        () => resolve(null),
        resolve,
      )
    })
    expect(error).toMatchObject({ code: 'permission-denied' })
  })

  test('unauthenticated cannot read or write', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice')))
    await assertFails(setDoc(doc(anon(), 'users/alice/sync/2025-10'), month()))
  })

  test('extra or missing fields', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile(), x: 1 }))
    await assertFails(setDoc(doc(db, 'users/alice'), { schemaVersion: 2 }))
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-10'), { ...month(), x: 1 }))
    const { month: _, ...withoutMonth } = month()
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-10'), withoutMonth))
    await assertFails(setDoc(doc(db, 'users/alice/sync/preferences'), { ...preferences(), x: 1 }))
    const { type: __, ...withoutType } = preferences()
    await assertFails(setDoc(doc(db, 'users/alice/sync/preferences'), withoutType))
  })

  test('a profile with a non-integer schemaVersion, a client createdAt or the layout-1 field', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile(), schemaVersion: '2' }))
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile(), createdAt: Timestamp.now() }))
    await assertFails(setDoc(doc(db, 'users/alice'), { createdAt: serverTimestamp(), schema: 1 }))
  })

  test('the wrong type, or a month field that is not the document id', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-10'), { ...month(), type: 'x' }))
    await assertFails(
      setDoc(doc(db, 'users/alice/sync/2025-10'), { ...month(), type: 'preferences' }),
    )
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-10'), month(undefined, '2025-11')))
    await assertFails(
      setDoc(doc(db, 'users/alice/sync/preferences'), { ...preferences(), type: 'events' }),
    )
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-10'), { ...month(), events: 'all' }))
    await assertFails(
      setDoc(doc(db, 'users/alice/sync/preferences'), { ...preferences(), preferences: [] }),
    )
  })

  test('removing an event key on update', async () => {
    const db = as('alice')
    const ref = doc(db, 'users/alice/sync/2025-10')
    await setDoc(ref, month())
    await assertFails(
      setDoc(ref, month({ '2|prayer|dhuhr': { logDay: '2025-10-09', deltaSeconds: null } })),
    )
  })

  test('bad sync document ids', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-1'), month(undefined, '2025-1')))
    await assertFails(setDoc(doc(db, 'users/alice/sync/oct'), month(undefined, 'oct')))
    await assertFails(setDoc(doc(db, 'users/alice/sync/prefs'), preferences()))
    await assertFails(setDoc(doc(db, 'users/alice/sync/other'), { x: 1 }))
  })

  test('updatedAt that is not request.time', async () => {
    const db = as('alice')
    await assertFails(
      setDoc(doc(db, 'users/alice/sync/2025-10'), { ...month(), updatedAt: Timestamp.now() }),
    )
    await assertFails(
      setDoc(doc(db, 'users/alice/sync/preferences'), {
        ...preferences(),
        updatedAt: Timestamp.now(),
      }),
    )
  })

  test('more than 64 preferences', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice/sync/preferences'), preferences(64)))
    await assertFails(setDoc(doc(db, 'users/alice/sync/preferences'), preferences(65)))
  })

  test('more than 3000 events in a month', async () => {
    const db = as('alice')
    const events = (count: number): Record<string, unknown> =>
      Object.fromEntries(
        Array.from({ length: count }, (_, i) => [
          `${i}|prayer|fajr`,
          { logDay: '2025-10-09', deltaSeconds: null },
        ]),
      )
    await assertSucceeds(setDoc(doc(db, 'users/alice/sync/2025-10'), month(events(3000))))
    await assertFails(setDoc(doc(db, 'users/alice/sync/2025-11'), month(events(3001), '2025-11')))
  })

  test('unknown collections and documents', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/state/other'), { x: 1 }))
    await assertFails(getDoc(doc(db, 'users/alice/state/other')))
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
  limit: Record<string, unknown> | null = { lastSentAt: serverTimestamp() },
): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'feedback')), data)
  if (limit) batch.set(doc(db, 'feedbackLimits', limitUid), limit)
  return batch.commit()
}

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
      lastSentAt: Timestamp.fromMillis(Date.now() - 61_000),
    })
    await assertSucceeds(send(as('alice')))
  })

  test('a stamp from before the rename (lastAt) still counts', async () => {
    await seed('feedbackLimits/alice', { lastAt: Timestamp.fromMillis(Date.now() - 30_000) })
    await assertFails(send(as('alice')))
    await seed('feedbackLimits/alice', { lastAt: Timestamp.fromMillis(Date.now() - 61_000) })
    await assertSucceeds(send(as('alice')))
  })

  test('the old field name is not written any more', async () => {
    await assertFails(send(as('alice'), feedback(), 'alice', { lastAt: serverTimestamp() }))
  })

  test('a second send within a minute is refused', async () => {
    const db = as('alice')
    await assertSucceeds(send(db))
    await assertFails(send(db))
  })

  test('a recent limit stamp refuses the send', async () => {
    await seed('feedbackLimits/alice', { lastSentAt: Timestamp.fromMillis(Date.now() - 30_000) })
    await assertFails(send(as('alice')))
  })

  test('without the limit doc in the batch', async () => {
    await assertFails(send(as('alice'), feedback(), 'alice', null))
    await seed('feedbackLimits/alice', { lastSentAt: Timestamp.fromMillis(Date.now() - 61_000) })
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
    await assertFails(send(as('alice'), feedback(), 'alice', { lastSentAt: Timestamp.now() }))
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
    await assertSucceeds(setDoc(ref, { lastSentAt: serverTimestamp() }))
    await assertSucceeds(setDoc(ref, { lastSentAt: serverTimestamp() }))
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
      setDoc(doc(as('mallory'), 'feedbackLimits/alice'), { lastSentAt: serverTimestamp() }),
    )
    await assertFails(
      setDoc(doc(anon(), 'feedbackLimits/alice'), { lastSentAt: serverTimestamp() }),
    )
    await assertFails(
      setDoc(doc(as('alice'), 'feedbackLimits/alice'), { lastSentAt: Timestamp.now() }),
    )
    await assertFails(
      setDoc(doc(as('alice'), 'feedbackLimits/alice'), { lastSentAt: serverTimestamp(), x: 1 }),
    )
    await seed('feedbackLimits/alice', { lastSentAt: Timestamp.now() })
    await assertFails(deleteDoc(doc(as('mallory'), 'feedbackLimits/alice')))
  })
})
