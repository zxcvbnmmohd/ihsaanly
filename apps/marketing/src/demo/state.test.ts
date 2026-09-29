import { describe, expect, test } from 'bun:test'
import { demoReducer, initialDemoState } from './state'

const ZONE = 'Asia/Riyadh'

describe('initialDemoState', () => {
  test('starts on Today with the coach ready to point at a prayer', () => {
    const state = initialDemoState(ZONE)
    expect(state.view).toBe('today')
    expect(state.previousTab).toBe('today')
    expect(state.selectedItemId).toBeNull()
    expect(state.libraryQuery).toBe('')
    expect(state.coachStep).toBe('mark')
    expect(state.marks).toEqual({})
    // Asia/Riyadh matches a built-in city exactly (Makkah is first in the list).
    expect(state.place.timeZone).toBe(ZONE)
  })
})

describe('select-tab', () => {
  test('switches the view and remembers it as the tab to return to', () => {
    const state = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    expect(state.view).toBe('library')
    expect(state.previousTab).toBe('library')
  })

  test('selecting More keeps the previous tab unchanged', () => {
    const onLibrary = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    const onMore = demoReducer(onLibrary, { type: 'select-tab', tab: 'more' })
    expect(onMore.view).toBe('more')
    expect(onMore.previousTab).toBe('library')
  })

  test('ends the coach', () => {
    const state = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    expect(state.coachStep).toBe('done')
  })
})

describe('open-item', () => {
  test('opens the item and remembers Today as the tab to return to', () => {
    const state = demoReducer(initialDemoState(ZONE), { type: 'open-item', id: 'wudu' })
    expect(state.view).toBe('item')
    expect(state.selectedItemId).toBe('wudu')
    expect(state.previousTab).toBe('today')
    expect(state.coachStep).toBe('done')
  })

  test('opening from Library remembers Library as the tab to return to', () => {
    const onLibrary = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    const onItem = demoReducer(onLibrary, { type: 'open-item', id: 'wudu' })
    expect(onItem.previousTab).toBe('library')
  })

  test('opening a second item from item detail keeps the earlier previousTab', () => {
    const first = demoReducer(initialDemoState(ZONE), { type: 'open-item', id: 'wudu' })
    const second = demoReducer(first, { type: 'open-item', id: 'ghusl' })
    expect(second.previousTab).toBe('today')
    expect(second.selectedItemId).toBe('ghusl')
  })
})

describe('back', () => {
  test('returns to the remembered tab and clears the selection', () => {
    const onLibrary = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    const onItem = demoReducer(onLibrary, { type: 'open-item', id: 'wudu' })
    const onBack = demoReducer(onItem, { type: 'back' })
    expect(onBack.view).toBe('library')
    expect(onBack.selectedItemId).toBeNull()
  })
})

describe('mark-prayer coach progression', () => {
  test("marking the coach's target advances mark -> open", () => {
    const state = demoReducer(initialDemoState(ZONE), {
      type: 'mark-prayer',
      prayer: 'fajr',
      at: new Date('2026-01-01T05:00:00Z'),
      wasCoachTarget: true,
    })
    expect(state.coachStep).toBe('open')
    expect(state.marks.fajr).toBeInstanceOf(Date)
  })

  test('marking something other than the target ends the coach', () => {
    const state = demoReducer(initialDemoState(ZONE), {
      type: 'mark-prayer',
      prayer: 'asr',
      at: new Date('2026-01-01T05:00:00Z'),
      wasCoachTarget: false,
    })
    expect(state.coachStep).toBe('done')
  })

  test('once done, the coach never restarts even on a fresh target hit', () => {
    const started = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    expect(started.coachStep).toBe('done')
    const marked = demoReducer(started, {
      type: 'mark-prayer',
      prayer: 'fajr',
      at: new Date('2026-01-01T05:00:00Z'),
      wasCoachTarget: true,
    })
    expect(marked.coachStep).toBe('done')
  })

  test('marking the same prayer twice toggles it off', () => {
    const at = new Date('2026-01-01T05:00:00Z')
    const marked = demoReducer(initialDemoState(ZONE), {
      type: 'mark-prayer',
      prayer: 'fajr',
      at,
      wasCoachTarget: true,
    })
    const unmarked = demoReducer(marked, {
      type: 'mark-prayer',
      prayer: 'fajr',
      at,
      wasCoachTarget: false,
    })
    expect(unmarked.marks.fajr).toBeUndefined()
  })
})

describe('library-query', () => {
  test('updates the search text only', () => {
    const state = demoReducer(initialDemoState(ZONE), { type: 'library-query', query: 'wudu' })
    expect(state.libraryQuery).toBe('wudu')
    expect(state.view).toBe('today')
  })
})

describe('item actions', () => {
  const AT = new Date('2026-03-01T12:00:00Z')

  test('the counter completes the item on reaching its target, and opening another item resets it', () => {
    let state = demoReducer(initialDemoState(ZONE), { type: 'open-item', id: 'x' })
    state = demoReducer(state, { type: 'tap-counter', id: 'x', target: 2, at: AT })
    expect(state.count).toBe(1)
    expect(state.completed.x).toBeUndefined()
    state = demoReducer(state, { type: 'tap-counter', id: 'x', target: 2, at: AT })
    expect(state.count).toBe(2)
    expect(state.completed.x).toEqual(AT)
    expect(demoReducer(state, { type: 'open-item', id: 'y' }).count).toBe(0)
  })

  test('done and on-Today both toggle', () => {
    const start = initialDemoState(ZONE)
    const done = demoReducer(start, { type: 'toggle-done', id: 'x', at: AT })
    expect(done.completed.x).toEqual(AT)
    expect(demoReducer(done, { type: 'toggle-done', id: 'x', at: AT }).completed.x).toBeUndefined()
    const added = demoReducer(start, { type: 'toggle-on-today', id: 'x' })
    expect(added.enabled).toContain('x')
    expect(demoReducer(added, { type: 'toggle-on-today', id: 'x' }).enabled).not.toContain('x')
  })

  test('the library filter changes independently of the query', () => {
    const state = demoReducer(initialDemoState(ZONE), { type: 'library-filter', filter: 'onToday' })
    expect(state.libraryFilter).toBe('onToday')
    expect(state.libraryQuery).toBe('')
  })
})
