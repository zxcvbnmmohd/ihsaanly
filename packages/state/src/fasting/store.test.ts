import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const events = await import('../storage/events')
const fasting = await import('./store')

const noon = new Date('2026-09-22T12:00:00Z')

describe('fasting', () => {
  beforeEach(resetStorage)

  it('files an owed fast against the local day of the instant', () => {
    fasting.recordFastOwed(new Date('2026-09-22T23:30:00Z'), 'Pacific/Auckland')

    expect(events.allActions()).toEqual([
      {
        kind: 'fast-owed',
        subject: 'fast',
        at: Date.parse('2026-09-22T23:30:00Z'),
        logDay: '2026-09-23',
        deltaSeconds: null,
      },
    ])
  })

  it('takes a record back with a later fact instead of deleting it', () => {
    fasting.recordFastOwed(noon, 'UTC')
    fasting.clearFastOwed(new Date(noon.getTime() + 1_000), 'UTC')

    expect(events.allActions().map((action) => action.kind)).toEqual([
      'fast-owed',
      'fast-owed-cleared',
    ])
  })

  it('records fasts made up a millisecond apart so none collapse into another', () => {
    fasting.recordFastsMadeUp(3, noon, 'UTC')

    expect(events.allActions().map((action) => action.at)).toEqual([
      noon.getTime(),
      noon.getTime() + 1,
      noon.getTime() + 2,
    ])
  })

  it('counts what is outstanding: owed days plus the backlog, less what was made up', () => {
    const { result } = renderHook(() => fasting.useFastsOutstanding())
    expect(result.current).toBe(0)

    act(() => fasting.setFastBacklog(2))
    act(() => fasting.recordFastOwed(noon, 'UTC'))
    expect(result.current).toBe(3)

    act(() => fasting.recordFastsMadeUp(1, new Date(noon.getTime() + 5_000), 'UTC'))
    expect(result.current).toBe(2)
  })

  it('knows which days are owed', () => {
    const { result } = renderHook(() => fasting.useFastOwedOn('2026-09-22'))
    expect(result.current).toBe(false)

    act(() => fasting.recordFastOwed(noon, 'UTC'))
    expect(result.current).toBe(true)

    act(() => fasting.clearFastOwed(new Date(noon.getTime() + 1_000), 'UTC'))
    expect(result.current).toBe(false)
  })
})
