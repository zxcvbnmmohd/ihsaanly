/**
 * Stands in for the native modules `src/storage/backend.ts` and the native
 * twins (`i18n/direction.ts`) import, so the real native code runs under Bun.
 * Import this before anything from `src` that touches storage; the modules are
 * mocked once per test process and every test file shares the same database,
 * so a test wipes it (`resetStorage`) rather than assuming it is empty.
 */
import { Database } from 'bun:sqlite'
import { mock } from 'bun:test'

/** The slice of expo-sqlite's synchronous API that `backend.ts` and `migrate` use, over bun:sqlite. */
export function wrap(db: Database): Record<string, unknown> {
  return {
    getFirstSync: (sql: string, ...params: never[]) => db.query(sql).get(...params) ?? null,
    getAllSync: (sql: string, ...params: never[]) => db.query(sql).all(...params),
    runSync: (sql: string, ...params: never[]) => db.query(sql).run(...params),
    execSync: (sql: string) => db.exec(sql),
    withTransactionSync: (work: () => void) => db.transaction(work)(),
  }
}

export const sqlite = {
  /** Every `openDatabaseSync` call, in order. */
  opens: [] as { name: string; directory: string | undefined }[],
  /** When set, the next non-memory open throws this. */
  failOpen: null as Error | null,
  /** The database the default (successful) open hands out. */
  db: new Database(':memory:'),
}

mock.module('expo-sqlite', () => ({
  openDatabaseSync: (name: string, _options?: unknown, directory?: string) => {
    sqlite.opens.push({ name, directory })
    if (name !== ':memory:' && sqlite.failOpen) throw sqlite.failOpen
    return wrap(name === ':memory:' ? new Database(':memory:') : sqlite.db)
  },
}))

export const constants = { expoConfig: { extra: {} as Record<string, unknown> } }
mock.module('expo-constants', () => ({ default: constants }))

export const fileSystem = {
  Paths: { appleSharedContainers: {} as Record<string, { uri: string } | undefined> },
}
mock.module('expo-file-system', () => fileSystem)

export const reactNative = {
  isRTL: false,
  allowed: [] as boolean[],
  forced: [] as boolean[],
  os: 'ios',
  reloads: [] as string[],
}
mock.module('react-native', () => ({
  I18nManager: {
    get isRTL() {
      return reactNative.isRTL
    },
    allowRTL: (value: boolean) => reactNative.allowed.push(value),
    forceRTL: (value: boolean) => reactNative.forced.push(value),
  },
  Platform: {
    get OS() {
      return reactNative.os
    },
  },
}))
mock.module('expo', () => ({
  reloadAppAsync: async (reason: string) => {
    reactNative.reloads.push(reason)
  },
}))
