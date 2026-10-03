import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('../storage/backend')
const { allActions } = await import('../storage/events')
const { onLocalWrite } = await import('../storage/local-writes')
const { reloadPreferences } = await import('../storage/preference-store')
const { MAX_PROGRESS_KEYS } = await import('../cloud/keys')
const { createLocalStore } = await import('../cloud/local-store')
const progress = await import('./store')

const TODAY = '2026-10-03'
const NOW = new Date('2026-10-03T08:00:00Z')

let period = `${TODAY}:morning`
let reset: () => void = () => {}
let written: (string | null)[] = []
let unlisten: () => void = () => {}

const stored = (itemId: string): unknown => {
  const row = backend.readPreferenceRow(`progress:${itemId}`)
  return row ? JSON.parse(row.value) : null
}

beforeEach(() => {
  resetStorage()
  period = `${TODAY}:morning`
  reset = progress.configureProgress({
    periodOf: () => period,
    now: () => NOW,
    timeZone: () => 'UTC',
  })
  written = []
  unlisten = onLocalWrite((key) => written.push(key))
})

afterEach(() => {
  unlisten()
  reset()
})

describe('counting', () => {
  it('starts empty, counts up, and stores it for the current period as a synced key', () => {
    expect(progress.getItemProgress('tasbih')).toEqual({ count: 0, parts: [] })
    progress.addCount('tasbih')
    expect(progress.addCount('tasbih', 11)).toEqual({ count: 12, parts: [] })
    expect(stored('tasbih')).toEqual({
      periodKey: `${TODAY}:morning`,
      count: 12,
      parts: [],
      updatedAt: NOW.getTime(),
    })
    expect(written).toEqual(['progress:tasbih', 'progress:tasbih'])
  })

  it('never counts below zero', () => {
    progress.addCount('tasbih', 2)
    expect(progress.addCount('tasbih', -5).count).toBe(0)
  })

  it('marks parts done and undone, sorted', () => {
    progress.setPartDone('adhkar', 'b', true)
    expect(progress.setPartDone('adhkar', 'a', true).parts).toEqual(['a', 'b'])
    expect(progress.setPartDone('adhkar', 'b', false)).toEqual({ count: 0, parts: ['a'] })
  })

  it('reads as empty once the period has moved on, and starts again from zero', () => {
    progress.addCount('tasbih', 7)
    period = `${TODAY}:evening`
    expect(progress.getItemProgress('tasbih')).toEqual({ count: 0, parts: [] })
    expect(progress.addCount('tasbih').count).toBe(1)
  })

  it('tells hook readers, including when a sync rewrites the row underneath', () => {
    const { result } = renderHook(() => progress.useItemProgress('tasbih'))
    expect(result.current).toEqual({ count: 0, parts: [] })

    act(() => {
      progress.addCount('tasbih', 3)
    })
    expect(result.current.count).toBe(3)

    act(() => {
      backend.writePreferenceRowAt(
        'progress:tasbih',
        JSON.stringify({ periodKey: period, count: 9, parts: [], updatedAt: 1 }),
        1,
      )
      reloadPreferences()
    })
    expect(result.current.count).toBe(9)
  })

  it('moves its revision for readers of many items', () => {
    const { result } = renderHook(() => progress.useProgressRevision())
    const before = result.current
    act(() => {
      progress.addCount('istighfar')
    })
    expect(result.current).toBeGreaterThan(before)
  })

  it('gives the same answer twice without reading again', () => {
    progress.addCount('tasbih')
    expect(progress.getItemProgress('tasbih')).toBe(progress.getItemProgress('tasbih'))
  })
})

describe('finishing', () => {
  it('completes at the repeat count: records item-completed and clears the progress', () => {
    progress.addCount('tasbih', 32)
    expect(progress.completeIfFinished('tasbih', { repeat: 33 })).toBe(false)
    expect(allActions()).toEqual([])

    progress.addCount('tasbih')
    expect(progress.completeIfFinished('tasbih', { repeat: 33 })).toBe(true)
    expect(allActions()).toMatchObject([
      { kind: 'item-completed', subject: 'tasbih', at: NOW.getTime(), logDay: TODAY },
    ])
    expect(stored('tasbih')).toBeNull()
    expect(progress.getItemProgress('tasbih')).toEqual({ count: 0, parts: [] })
    expect(written.at(-1)).toBe('progress:tasbih')
  })

  it('completes an item with parts once every part is done', () => {
    const item = { repeat: 1, parts: [{ id: 'a' }, { id: 'b' }] }
    progress.setPartDone('adhkar', 'a', true)
    expect(progress.completeIfFinished('adhkar', item)).toBe(false)
    progress.setPartDone('adhkar', 'b', true)
    expect(progress.completeIfFinished('adhkar', item)).toBe(true)
  })

  it('mark all done records the window it was done in', () => {
    reset()
    reset = progress.configureProgress({
      periodOf: () => period,
      now: () => NOW,
      timeZone: () => 'UTC',
      windowOf: () => ({
        startsAt: new Date(NOW.getTime() - 60_000),
        endsAt: new Date(NOW.getTime() + 60_000),
      }),
    })
    progress.markAllDone('adhkar')
    expect(allActions()).toMatchObject([{ kind: 'item-completed', deltaSeconds: 0 }])
  })

  it('unmarking records item-uncompleted and starts the progress over', () => {
    progress.addCount('tasbih', 5)
    progress.unmarkItem('tasbih')
    expect(allActions()).toMatchObject([{ kind: 'item-uncompleted', subject: 'tasbih' }])
    expect(stored('tasbih')).toBeNull()
  })

  it('clearing nothing writes nothing', () => {
    progress.clearProgress('never')
    expect(written).toEqual([])
  })
})

describe('pruning', () => {
  const seed = (itemId: string, periodKey: string, at: number): void =>
    backend.writePreferenceRowAt(
      `progress:${itemId}`,
      JSON.stringify({ periodKey, count: 1, parts: [], updatedAt: at }),
      at,
    )

  it('drops other items’ progress from earlier days, and unreadable rows, on a write', () => {
    seed('yesterday', '2026-10-02:evening', 1)
    seed('earlier-today', `${TODAY}:fajr`, 2)
    backend.writePreferenceRowAt('progress:broken', '{"oops', 3)
    backend.writePreferenceRowAt('theme', '"dark"', 3)

    progress.addCount('tasbih')

    expect(stored('yesterday')).toBeNull()
    expect(backend.readPreferenceRow('progress:broken')).toBeNull()
    expect(stored('earlier-today')).not.toBeNull()
    expect(backend.readPreferenceRow('theme')).not.toBeNull()
    expect(written).toEqual(
      expect.arrayContaining(['progress:yesterday', 'progress:broken', 'progress:tasbih']),
    )
  })

  it('keeps at most MAX_PROGRESS_KEYS, dropping the oldest', () => {
    for (let i = 0; i < MAX_PROGRESS_KEYS + 2; i++) seed(`item-${i}`, `${TODAY}:day`, 100 + i)

    progress.addCount('tasbih')

    const keys = backend
      .preferenceRowsWithTime()
      .filter((row) => row.key.startsWith('progress:'))
      .map((row) => row.key)
    expect(keys).toHaveLength(MAX_PROGRESS_KEYS)
    expect(keys).toContain('progress:tasbih')
    expect(keys).not.toContain('progress:item-0')
    expect(keys).not.toContain('progress:item-2')
    expect(keys).toContain('progress:item-3')
  })
})

describe('the defaults', () => {
  it('keeps progress per calendar day in the device zone', () => {
    reset()
    reset = () => {}
    progress.addCount('tasbih')
    const value = stored('tasbih') as { periodKey: string }
    expect(value.periodKey).toMatch(/^\d{4}-\d{2}-\d{2}:day$/)
    progress.markAllDone('tasbih')
    expect(allActions()).toHaveLength(1)
  })
})

describe('progress in the sync store', () => {
  it('offers progress keys to sync', () => {
    progress.addCount('tasbih')
    expect(
      createLocalStore()
        .preferences()
        .map((preference) => preference.key),
    ).toContain('progress:tasbih')
  })

  it('merges progress both devices changed; newest-wins for anything else', () => {
    const local = createLocalStore()
    const value = (count: number, parts: string[]): string =>
      JSON.stringify({ periodKey: period, count, parts, updatedAt: 1 })
    expect(
      local.mergePreference?.(
        { key: 'progress:x', value: value(3, ['a']), updatedAt: 1 },
        { key: 'progress:x', value: value(2, ['b']), updatedAt: 2 },
      ),
    ).toBe(value(3, ['a', 'b']))
    expect(
      local.mergePreference?.(
        { key: 'theme', value: '"dark"', updatedAt: 1 },
        { key: 'theme', value: '"light"', updatedAt: 2 },
      ),
    ).toBeNull()
  })

  it('drops only progress keys another device dropped, and tells readers', () => {
    progress.addCount('tasbih', 4)
    backend.writePreferenceRowAt('theme', '"dark"', 3)
    const local = createLocalStore()

    local.removePreferences?.(['theme'])
    expect(backend.readPreferenceRow('theme')).not.toBeNull()

    local.removePreferences?.(['progress:tasbih', 'theme'])
    expect(stored('tasbih')).toBeNull()
    expect(backend.readPreferenceRow('theme')).not.toBeNull()
    expect(progress.getItemProgress('tasbih').count).toBe(0)
  })
})
