import { beforeEach, describe, expect, it, type Mock, mock } from 'bun:test'
import type { StartingPointScreenProps } from '@ihsaanly/ui/screens/starting-point'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'
import type { ConfirmReplace } from './starting-point'

const { act, renderHook } = await withDom()
const { items } = await import('@ihsaanly/core/content')
const { idsForPreset } = await import('@ihsaanly/core/plan/presets')
const events = await import('../storage/events')
const { completeItem } = await import('./completions')
const { getEnabledItems, setEnabledItems, toggleEnabled } = await import('./enabled-store')
const { pauseTracking } = await import('./user-state-store')
const { currentStartingPoint, enabledForPreset, useStartingPointScreen } = await import(
  './starting-point'
)

const pauseOnly = items.filter((item) => item.onlyWhilePaused).map((item) => item.id)
const starting = idsForPreset('starting', items)
const essentials = idsForPreset('essentials', items)
const everything = idsForPreset('everything', items)
const sorted = (ids: string[]): string[] => [...ids].sort()

describe('currentStartingPoint', () => {
  it('names the preset the enabled items equal', () => {
    expect(currentStartingPoint(starting, items)).toBe('starting')
    expect(currentStartingPoint(essentials, items)).toBe('essentials')
    expect(currentStartingPoint(everything, items)).toBe('everything')
  })

  it('is null once the set has been edited by hand', () => {
    expect(items.some((item) => item.id === 'witr')).toBe(true)
    expect(currentStartingPoint([...starting, 'witr'], items)).toBeNull()
    expect(currentStartingPoint(starting.slice(1), items)).toBeNull()
  })

  it('ignores the pause-only items the app switches on itself', () => {
    expect(pauseOnly.length).toBeGreaterThan(0)
    expect(currentStartingPoint([...starting, ...pauseOnly], items)).toBe('starting')
  })
})

describe('enabledForPreset', () => {
  it("is the preset's own items", () => {
    expect(sorted(enabledForPreset('essentials', starting, items))).toEqual(sorted(essentials))
  })

  it('keeps the pause-only items already on', () => {
    const chosen = enabledForPreset('starting', [...essentials, ...pauseOnly], items)
    expect(sorted(chosen)).toEqual(sorted([...starting, ...pauseOnly]))
  })
})

describe('useStartingPointScreen', () => {
  beforeEach(resetStorage)

  function render(confirm: Mock<ConfirmReplace> = mock(() => {})): {
    confirm: Mock<ConfirmReplace>
    result: { current: StartingPointScreenProps }
  } {
    const { result } = renderHook(() => useStartingPointScreen(confirm))
    return { confirm, result }
  }

  it('switches between presets without asking', () => {
    setEnabledItems(starting)
    const { result, confirm } = render()
    expect(result.current.current).toBe('starting')

    act(() => result.current.onSelect('everything'))

    expect(confirm).not.toHaveBeenCalled()
    expect(sorted(getEnabledItems())).toEqual(sorted(everything))
    expect(result.current.current).toBe('everything')
  })

  it('does nothing for the preset already chosen', () => {
    setEnabledItems(essentials)
    const { result, confirm } = render()
    act(() => result.current.onSelect('essentials'))
    expect(confirm).not.toHaveBeenCalled()
    expect(sorted(getEnabledItems())).toEqual(sorted(essentials))
  })

  it('asks before replacing a hand-made set, and leaves it if the answer is no', () => {
    setEnabledItems([...starting, 'witr'])
    const { result, confirm } = render()
    expect(result.current.current).toBeNull()

    act(() => result.current.onSelect('starting'))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(sorted(getEnabledItems())).toEqual(sorted([...starting, 'witr']))
  })

  it('replaces it once confirmed', () => {
    setEnabledItems([...starting, 'witr'])
    const { result } = render(mock((proceed: () => void) => proceed()))

    act(() => result.current.onSelect('essentials'))

    expect(sorted(getEnabledItems())).toEqual(sorted(essentials))
    expect(result.current.current).toBe('essentials')
  })

  it('follows edits made in the Library', () => {
    setEnabledItems(starting)
    const { result } = render()
    act(() => toggleEnabled('witr'))
    expect(result.current.current).toBeNull()
  })

  it('still names the preset after pausing switches on the pause-only items', () => {
    setEnabledItems(starting)
    const { result } = render()
    act(() => pauseTracking({ checkInDays: null }))
    expect(getEnabledItems()).toEqual(expect.arrayContaining(pauseOnly))
    expect(result.current.current).toBe('starting')
  })

  it('never touches the practice record', () => {
    setEnabledItems(starting)
    completeItem('witr', new Date('2026-09-22T09:00:00Z'), 'UTC')
    const before = events.allActions()
    const { result } = render()

    act(() => result.current.onSelect('everything'))
    act(() => result.current.onSelect('starting'))

    expect(events.allActions()).toEqual(before)
  })
})
