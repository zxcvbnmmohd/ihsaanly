import { describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'

const { act, renderHook } = await withDom()
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
const { useNow } = await import('./use-now')

describe('useNow', () => {
  it('starts at the current time', () => {
    const before = Date.now()
    const { result } = renderHook(() => useNow())

    expect(result.current.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.current.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('ticks on the interval it was given', async () => {
    const { result } = renderHook(() => useNow(10))
    const first = result.current

    await act(() => wait(50))

    expect(result.current).not.toBe(first)

    expect(result.current.getTime()).toBeGreaterThanOrEqual(first.getTime())
  })

  it('stops ticking once it is unmounted', async () => {
    const { result, unmount } = renderHook(() => useNow(10))
    unmount()
    const last = result.current

    await wait(40)

    expect(result.current).toBe(last)
  })
})
