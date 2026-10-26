import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { markCoachTourSeen, resetCoachTours, useCoachTourSeen } = await import('./tours')
const hints = await import('../today/hints')

beforeEach(() => resetStorage())

describe('coach tours', () => {
  it('are unseen until marked, and marking twice keeps one', () => {
    const { result } = renderHook(() => ({
      reader: useCoachTourSeen('reader'),
      gallery: useCoachTourSeen('widgetGallery'),
    }))
    expect(result.current).toEqual({ reader: false, gallery: false })
    act(() => markCoachTourSeen('reader'))
    act(() => markCoachTourSeen('reader'))
    expect(result.current).toEqual({ reader: true, gallery: false })
  })

  it('all play again after Show me around, Today’s included', () => {
    hints.setTourSeen()
    markCoachTourSeen('reader')
    markCoachTourSeen('widgetGallery')
    const { result } = renderHook(() => useCoachTourSeen('reader'))
    expect(result.current).toBe(true)
    act(() => resetCoachTours())
    expect(result.current).toBe(false)
    expect(hints.getTodayHints().tourSeen).toBe(false)
  })
})
