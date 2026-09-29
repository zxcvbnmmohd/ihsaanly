import { expect, it } from 'bun:test'

/**
 * A blob written before sync existed: no `synced` flags, no preference times,
 * and a batch of make-ups sharing one instant. The backend reads localStorage
 * at import, so this file seeds it first and imports its own copy (the query
 * string keeps it apart from the one `backend.web.test.ts` loads).
 */
const legacy = {
  preferences: { locale: '"en"' },
  events: [1, 2, 3].map((id) => ({
    id,
    kind: 'prayer-made-up',
    subject: 'fajr',
    at: 1_000,
    logDay: '2026-09-22',
    windowStart: null,
    windowEnd: null,
    deltaSeconds: null,
  })),
}

const data = new Map([['ihsaanly.db.v1', JSON.stringify(legacy)]])
;(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => {
    data.set(key, value)
  },
}

const backend = (await import('./backend.web?legacy' as string)) as typeof import('./backend.web')

it('loads a pre-sync blob: everything unsynced, preferences stamped 0, batches kept', () => {
  expect(backend.preferenceRowsWithTime()).toEqual([{ key: 'locale', value: '"en"', updatedAt: 0 }])
  expect(backend.unsyncedEventRows().map((row) => row.at)).toEqual([1_000, 1_001, 1_002])
  expect(backend.countRows(['prayer-made-up'])).toEqual([
    { subject: 'fajr', kind: 'prayer-made-up', total: 3 },
  ])
})
