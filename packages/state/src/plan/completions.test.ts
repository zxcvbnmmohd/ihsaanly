import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const events = await import('../storage/events')
const { completeItem, uncompleteItem, useCompletedToday } = await import('./completions')

const at = new Date('2026-09-22T09:00:00Z')

describe('completions', () => {
  beforeEach(resetStorage)

  it('files a completion against the local day, with its window for the timing metric', () => {
    completeItem('witr', at, 'UTC', {
      startsAt: new Date('2026-09-22T08:00:00Z'),
      endsAt: new Date('2026-09-22T10:00:00Z'),
    })

    expect(events.allActions()).toEqual([
      {
        kind: 'item-completed',
        subject: 'witr',
        at: at.getTime(),
        logDay: '2026-09-22',
        deltaSeconds: 0,
      },
    ])
  })

  it('files one without a window too', () => {
    completeItem('witr', at, 'UTC')
    expect(events.allActions()[0]?.deltaSeconds).toBeNull()
  })

  it("shows today's completions and drops one that is undone", () => {
    const { result } = renderHook(() => useCompletedToday('UTC', at))
    expect(result.current).toEqual({})

    act(() => completeItem('witr', at, 'UTC'))
    expect(result.current).toEqual({ witr: at })

    act(() => uncompleteItem('witr', new Date(at.getTime() + 1_000), 'UTC'))
    expect(result.current).toEqual({})
  })

  it("does not show yesterday's completions today", () => {
    completeItem('witr', new Date('2026-09-21T09:00:00Z'), 'UTC')
    const { result } = renderHook(() => useCompletedToday('UTC', at))
    expect(result.current).toEqual({})
  })
})
