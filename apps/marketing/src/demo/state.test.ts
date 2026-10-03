import { describe, expect, test } from 'bun:test'
import { demoItemById } from './demo-content'
import { type DemoAction, demoReducer, initialDemoState } from './state'

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

describe('back, reset-counter, remind and unknown actions', () => {
  test('back returns to the tab the item was opened from', () => {
    const onLibrary = demoReducer(initialDemoState(ZONE), { type: 'select-tab', tab: 'library' })
    const onItem = demoReducer(onLibrary, { type: 'open-item', id: 'x' })
    const back = demoReducer(onItem, { type: 'back' })
    expect(back.view).toBe('library')
    expect(back.selectedItemId).toBeNull()
  })

  test('reset-counter zeroes the count', () => {
    const counted = demoReducer(initialDemoState(ZONE), {
      type: 'tap-counter',
      id: 'x',
      target: 5,
      at: new Date(),
    })
    expect(counted.count).toBe(1)
    expect(demoReducer(counted, { type: 'reset-counter' }).count).toBe(0)
  })

  test('reminders are kept per item', () => {
    let state = demoReducer(initialDemoState(ZONE), { type: 'toggle-remind', id: 'x', value: true })
    state = demoReducer(state, { type: 'toggle-remind', id: 'y', value: false })
    expect(state.remind).toEqual({ x: true, y: false })
    expect(demoReducer(state, { type: 'toggle-remind', id: 'x', value: false }).remind.x).toBe(
      false,
    )
  })

  test('an unknown action leaves the state as it was', () => {
    const state = initialDemoState(ZONE)
    expect(demoReducer(state, { type: 'nope' } as unknown as DemoAction)).toBe(state)
  })
})

describe('Today circles', () => {
  const at = new Date(Date.UTC(2026, 8, 30, 10))
  const start = initialDemoState(ZONE)

  function run(actions: DemoAction[]): ReturnType<typeof initialDemoState> {
    return actions.reduce(demoReducer, start)
  }

  test('a circle on a single item completes it, shows the undo bar and ends the coach', () => {
    const state = run([{ type: 'circle', id: 'witr', done: false, at }])
    expect(state.completed.witr).toBe(at)
    expect(state.undo).toEqual({ itemId: 'witr', seq: 1 })
    expect(state.coachStep).toBe('done')
  })

  test('a circle on a done item unmarks it and clears its undo bar and progress', () => {
    const state = run([
      { type: 'circle', id: 'witr', done: false, at },
      { type: 'circle', id: 'witr', done: true, at },
    ])
    expect(state.completed.witr).toBeUndefined()
    expect(state.undo).toBeNull()
  })

  test("unmarking another item leaves the last item's undo bar", () => {
    const state = run([
      { type: 'circle', id: 'witr', done: false, at },
      { type: 'circle', id: 'duha-prayer', done: true, at },
    ])
    expect(state.undo?.itemId).toBe('witr')
  })

  test('a circle on an unknown item does nothing', () => {
    expect(run([{ type: 'circle', id: 'nope', done: false, at }])).toEqual(start)
  })

  test('the undo bar undoes the last mark, dismisses, and restarts for each mark', () => {
    const marked = run([
      { type: 'circle', id: 'witr', done: false, at },
      { type: 'circle', id: 'duha-prayer', done: false, at },
    ])
    expect(marked.undo).toEqual({ itemId: 'duha-prayer', seq: 2 })
    const undone = demoReducer(marked, { type: 'undo' })
    expect(undone.completed['duha-prayer']).toBeUndefined()
    expect(undone.completed.witr).toBe(at)
    expect(demoReducer(undone, { type: 'undo' })).toBe(undone)
    expect(demoReducer(marked, { type: 'dismiss-undo' }).undo).toBeNull()
  })

  test('a counted item opens its panel, counts up, and completes at its repeat', () => {
    const opened = run([{ type: 'circle', id: 'tasbih-after-prayer', done: false, at }])
    expect(opened.panelItemId).toBe('tasbih-after-prayer')
    expect(opened.completed['tasbih-after-prayer']).toBeUndefined()
    let state = opened
    for (let tap = 0; tap < 32; tap++) {
      state = demoReducer(state, { type: 'panel-count', id: 'tasbih-after-prayer', at })
    }
    expect(state.progress['tasbih-after-prayer']?.count).toBe(32)
    expect(state.panelItemId).toBe('tasbih-after-prayer')
    state = demoReducer(state, { type: 'panel-count', id: 'tasbih-after-prayer', at })
    expect(state.completed['tasbih-after-prayer']).toBe(at)
    expect(state.panelItemId).toBeNull()
    expect(state.undo?.itemId).toBe('tasbih-after-prayer')
    expect(demoReducer(state, { type: 'undo' }).progress['tasbih-after-prayer']).toBeUndefined()
  })

  test('the panel closes without completing, and Complete finishes a counted item', () => {
    const opened = run([{ type: 'circle', id: 'istighfar', done: false, at }])
    expect(demoReducer(opened, { type: 'close-panel' }).panelItemId).toBeNull()
    const done = demoReducer(opened, { type: 'panel-complete', id: 'istighfar', at })
    expect(done.completed.istighfar).toBe(at)
    expect(done.panelItemId).toBeNull()
  })

  test('an item with parts opens a checklist that completes when every part is ticked', () => {
    const opened = run([{ type: 'circle', id: 'morning-adhkar', done: false, at }])
    expect(opened.panelItemId).toBe('morning-adhkar')
    const ids = (demoItemById('morning-adhkar')?.parts ?? []).map((part) => part.id)
    expect(ids.length).toBeGreaterThan(1)
    let state = opened
    for (const partId of ids.slice(0, -1)) {
      state = demoReducer(state, { type: 'panel-toggle-part', id: 'morning-adhkar', partId, at })
    }
    expect(state.completed['morning-adhkar']).toBeUndefined()
    // Untick one, tick it again, then the last.
    const first = ids[0] ?? ''
    state = demoReducer(state, {
      type: 'panel-toggle-part',
      id: 'morning-adhkar',
      partId: first,
      at,
    })
    expect(state.progress['morning-adhkar']?.parts).not.toContain(first)
    for (const partId of [first, ids[ids.length - 1] ?? '']) {
      state = demoReducer(state, { type: 'panel-toggle-part', id: 'morning-adhkar', partId, at })
    }
    expect(state.completed['morning-adhkar']).toBe(at)
    expect(state.panelItemId).toBeNull()
  })

  test('Complete on an item with parts fills the checklist', () => {
    const state = run([{ type: 'panel-complete', id: 'morning-adhkar', at }])
    expect(state.progress['morning-adhkar']?.parts.length).toBeGreaterThan(1)
  })

  test('sheet actions on an unknown item still behave', () => {
    const counted = run([{ type: 'panel-count', id: 'nope', at }])
    expect(counted.completed.nope).toBe(at)
    const ticked = run([{ type: 'panel-toggle-part', id: 'nope', partId: 'a', at }])
    expect(ticked.completed.nope).toBe(at)
    expect(run([{ type: 'panel-complete', id: 'nope', at }]).completed.nope).toBe(at)
  })
})
