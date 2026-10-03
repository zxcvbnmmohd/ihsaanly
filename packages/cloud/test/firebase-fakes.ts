// In-memory stand-ins for the Firebase SDK entries the adapters import, for
// unit tests that run without an emulator. Import this file first, then
// `await import()` the code under test so it picks the fakes up (docs/TESTING.md).
//
// The fakes behave, not just record: the Firestore one keeps documents,
// applies batched writes (merge included) and answers the ordered, filtered
// queries the sync adapter makes, so tests assert on what ends up stored.
import { mock } from 'bun:test'

// Captured before the mock is installed: other test files still need the real Timestamp.
const realFirestore = await import('firebase/firestore')
const { Timestamp } = realFirestore
type Timestamp = InstanceType<typeof Timestamp>

type Data = Record<string, unknown>

export interface Call {
  /** 'app' | 'firestore' | 'auth' | 'auth/web-extension' */
  entry: string
  fn: string
  args: unknown[]
}

/** Everything the fakes recorded and hold; `resetFakes()` clears it. */
export const fake = {
  calls: [] as Call[],
  // app
  apps: [] as { name: string; options: Data }[],
  // firestore
  docs: new Map<string, Data>(),
  /** The operation count of every committed batch, in order. */
  batches: [] as number[],
  /** Document reads (getDoc), by path. */
  reads: [] as string[],
  clock: 1,
  /** How many auto ids `doc(collection)` has handed out. */
  autoIds: 0,
  firestores: new Map<unknown, { app: unknown; options: Data | undefined }>(),
  // auth
  auths: new Map<unknown, FakeAuth>(),
  /** What the next sign-in/link function resolves with. */
  user: { uid: 'user-1' } as Data,
  /** A function name (e.g. 'signInWithPopup', or 'commit' for a batch) → the error it rejects with. */
  failures: new Map<string, unknown>(),
}

export interface FakeAuth {
  app: unknown
  currentUser: Data | null
  emulatorConfig: { url: string } | null
  deps: unknown
  signOut: () => Promise<void>
  onAuthStateChanged: (listener: (user: unknown) => void) => () => void
}

export function resetFakes(): void {
  fake.calls = []
  fake.apps = []
  fake.docs = new Map()
  fake.batches = []
  fake.reads = []
  fake.clock = 1
  fake.autoIds = 0
  fake.firestores = new Map()
  fake.auths = new Map()
  fake.user = { uid: 'user-1' }
  fake.failures = new Map()
}

export function callsTo(fn: string, entry?: string): unknown[][] {
  return fake.calls
    .filter((call) => call.fn === fn && (entry === undefined || call.entry === entry))
    .map((call) => call.args)
}

function record(entry: string, fn: string, args: unknown[]): void {
  fake.calls.push({ entry, fn, args })
}

// --- firebase/app ------------------------------------------------------------

mock.module('firebase/app', () => ({
  getApps: () => fake.apps,
  getApp: () => {
    const app = fake.apps[0]
    if (!app) throw new Error('no-app')
    return app
  },
  initializeApp: (options: Data) => {
    record('app', 'initializeApp', [options])
    const app = { name: '[DEFAULT]', options }
    fake.apps.push(app)
    return app
  },
}))

// --- firebase/firestore --------------------------------------------------------

interface Ref {
  kind: 'doc' | 'col'
  path: string
}
interface QueryRef {
  kind: 'query'
  col: Ref
  constraints: { type: 'where' | 'orderBy'; field: string; op?: string; value?: unknown }[]
}
const SERVER_TIME = { __serverTimestamp: true }

const isPlain = (value: unknown): value is Data =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Timestamp) &&
  value !== SERVER_TIME &&
  !Array.isArray(value)

function resolveTimes(value: unknown, at: Timestamp): unknown {
  if (value === SERVER_TIME) return at
  if (!isPlain(value)) return value
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveTimes(v, at)]))
}

function merge(into: Data, from: Data): Data {
  const out: Data = { ...into }
  for (const [key, value] of Object.entries(from)) {
    const existing = out[key]
    out[key] = isPlain(value) && isPlain(existing) ? merge(existing, value) : value
  }
  return out
}

interface Snapshot {
  id: string
  ref: Ref
  exists: () => boolean
  data: () => Data | undefined
  get: (field: string) => unknown
}

const idOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

function snapshot(path: string, data: Data | undefined): Snapshot {
  return {
    id: idOf(path),
    ref: { kind: 'doc', path } satisfies Ref,
    exists: () => data !== undefined,
    data: () => data,
    get: (field: string) => data?.[field],
  }
}

function childrenOf(col: string): [string, Data][] {
  return [...fake.docs].filter(([path]) => {
    if (!path.startsWith(`${col}/`)) return false
    return !path.slice(col.length + 1).includes('/')
  })
}

const compare = (a: unknown, b: unknown): number =>
  a instanceof Timestamp && b instanceof Timestamp ? a.valueOf().localeCompare(b.valueOf()) : 0

mock.module('firebase/firestore', () => ({
  ...realFirestore,
  memoryLocalCache: () => ({ kind: 'memory' }),
  initializeFirestore: (app: unknown, options?: Data) => {
    record('firestore', 'initializeFirestore', [app, options])
    if (fake.firestores.has(app)) throw new Error('firestore/already-initialized')
    const db = { kind: 'db', app, options }
    fake.firestores.set(app, { app, options })
    return db
  },
  getFirestore: (app: unknown) => {
    record('firestore', 'getFirestore', [app])
    return { kind: 'db', app, options: fake.firestores.get(app)?.options }
  },
  connectFirestoreEmulator: (...args: unknown[]) =>
    record('firestore', 'connectFirestoreEmulator', args),
  collection: (_db: unknown, ...segments: string[]): Ref => ({
    kind: 'col',
    path: segments.join('/'),
  }),
  doc: (parent: unknown, ...segments: string[]): Ref => {
    const base = (parent as Ref).kind === 'col' ? [(parent as Ref).path] : []
    // doc(collection(...)) with no id: an auto id, like the SDK's.
    const ids = segments.length === 0 ? [`auto-${++fake.autoIds}`] : segments
    return { kind: 'doc', path: [...base, ...ids].join('/') }
  },
  serverTimestamp: () => SERVER_TIME,
  where: (field: string, op: string, value: unknown) => ({ type: 'where', field, op, value }),
  orderBy: (field: string) => ({ type: 'orderBy', field }),
  query: (col: Ref, ...constraints: QueryRef['constraints']): QueryRef => ({
    kind: 'query',
    col,
    constraints,
  }),
  getDoc: async (ref: Ref) => {
    fake.reads.push(ref.path)
    return snapshot(ref.path, fake.docs.get(ref.path))
  },
  getDocs: async (source: Ref | QueryRef) => {
    const col = source.kind === 'query' ? source.col : source
    let rows = childrenOf(col.path)
    for (const constraint of source.kind === 'query' ? source.constraints : []) {
      if (constraint.type === 'where') {
        rows = rows.filter(([, data]) => compare(data[constraint.field], constraint.value) > 0)
      } else {
        rows.sort(([, a], [, b]) => compare(a[constraint.field], b[constraint.field]))
      }
    }
    return { docs: rows.map(([path, data]) => snapshot(path, data)) }
  },
  writeBatch: () => {
    const ops: (() => void)[] = []
    return {
      set: (ref: Ref, data: Data, options?: { merge?: boolean }) => {
        ops.push(() => {
          const at = new Timestamp(fake.clock, 0)
          const resolved = resolveTimes(data, at) as Data
          const existing = fake.docs.get(ref.path)
          fake.docs.set(ref.path, options?.merge && existing ? merge(existing, resolved) : resolved)
        })
      },
      delete: (ref: Ref) => {
        ops.push(() => {
          fake.docs.delete(ref.path)
        })
      },
      commit: async () => {
        if (fake.failures.has('commit')) throw fake.failures.get('commit')
        fake.batches.push(ops.length)
        for (const op of ops) op()
        fake.clock += 1
      },
    }
  },
}))

// --- firebase/auth and firebase/auth/web-extension --------------------------------

function makeAuth(app: unknown, deps?: unknown): FakeAuth {
  const listeners = new Set<(user: unknown) => void>()
  const auth: FakeAuth = {
    app,
    currentUser: null,
    emulatorConfig: null,
    deps,
    signOut: async () => {
      auth.currentUser = null
    },
    onAuthStateChanged: (listener) => {
      listeners.add(listener)
      listener(auth.currentUser)
      return () => listeners.delete(listener)
    },
  }
  fake.auths.set(app, auth)
  return auth
}

function authModule(entry: string): Record<string, unknown> {
  /** A sign-in style function: records, rejects when told to, else resolves `{ user }`. */
  const action = (fn: string): ((...args: unknown[]) => Promise<{ user: Data }>) => {
    return async (...args) => {
      record(entry, fn, args)
      if (fake.failures.has(fn)) throw fake.failures.get(fn)
      return { user: fake.user }
    }
  }
  class GoogleAuthProvider {
    readonly providerId = 'google.com'
    static credential(idToken: unknown, accessToken?: unknown): Data {
      return { kind: 'google-credential', idToken, accessToken }
    }
    static credentialFromError(error: unknown): Data {
      return { kind: 'google-from-error', error }
    }
  }
  class OAuthProvider {
    constructor(readonly providerId: string) {}
    credential = (options: Data) => ({ kind: 'oauth-credential', id: this.providerId, ...options })
    static credentialFromError = (error: unknown) => ({ kind: 'apple-from-error', error })
  }
  return {
    GoogleAuthProvider,
    OAuthProvider,
    indexedDBLocalPersistence: { type: 'indexeddb' },
    getReactNativePersistence: (storage: unknown) => ({ type: 'react-native', storage }),
    getAuth: (app: unknown) => {
      record(entry, 'getAuth', [app])
      return fake.auths.get(app) ?? makeAuth(app)
    },
    initializeAuth: (app: unknown, deps: unknown) => {
      record(entry, 'initializeAuth', [app, deps])
      if (fake.auths.has(app)) throw new Error('auth/already-initialized')
      return makeAuth(app, deps)
    },
    connectAuthEmulator: (auth: FakeAuth, url: string) => {
      record(entry, 'connectAuthEmulator', [auth, url])
      auth.emulatorConfig = { url }
    },
    signInWithPopup: action('signInWithPopup'),
    linkWithPopup: action('linkWithPopup'),
    reauthenticateWithPopup: action('reauthenticateWithPopup'),
    signInWithCredential: action('signInWithCredential'),
    linkWithCredential: action('linkWithCredential'),
    reauthenticateWithCredential: action('reauthenticateWithCredential'),
  }
}

mock.module('firebase/auth', () => authModule('auth'))
mock.module('firebase/auth/web-extension', () => authModule('auth/web-extension'))
