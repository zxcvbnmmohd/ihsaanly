import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Plan, PlannedItem, TodayModel } from '@ihsaanly/core/plan/signals'
import { en } from '@ihsaanly/core/strings/en'
import type { RenderHookResult } from '@testing-library/react'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { allActions } = await import('../storage/events')
const progress = await import('../progress/store')
const { setOnboarding } = await import('../onboarding/store')
const { getUserState, setUserState } = await import('../plan/user-state-store')
const hints = await import('./hints')
const { useTodaySunnah } = await import('./use-today-sunnah')

const NOW = new Date('2026-10-03T07:00:00Z')
let reset: () => void = () => {}

const item = (itemId: string, reason: PlannedItem['reason'] = 'current-window'): PlannedItem => ({
  itemId,
  reason,
})

function planWith(today: Partial<TodayModel>): Plan {
  return {
    today: {
      hijri: { year: 1448, month: 4, day: 11 },
      window: 'fajr',
      jumuah: false,
      now: [],
      done: [],
      rightNow: null,
      context: [],
      comingUp: [],
      next: null,
      pausedNotice: null,
      checkInDue: false,
      ...today,
    },
    notifications: [],
  }
}

const open = planWith({
  now: [item('witr'), item('tasbih-after-prayer', 'after-prayer'), item('morning-adhkar')],
  comingUp: [item('duha-prayer', 'today'), { ...item('fast-monday', 'upcoming'), daysAway: 1 }],
  next: {
    prayer: 'dhuhr',
    jumuah: false,
    startsAt: new Date('2026-10-03T12:00:00Z'),
    before: ['witr', 'nothing-here'],
    after: ['tasbih-after-prayer'],
  },
})

interface Props {
  planned: Plan | null
  replayTour: boolean
}

const onTourEnd = mock(() => {})

function render(
  initial: Props = { planned: open, replayTour: false },
): RenderHookResult<ReturnType<typeof useTodaySunnah>, Props> {
  return renderHook(
    (props: Props) =>
      useTodaySunnah({ ...props, strings: en, now: NOW, timeZone: 'UTC', onTourEnd }),
    { initialProps: initial },
  )
}

beforeEach(() => {
  resetStorage()
  onTourEnd.mockClear()
  reset = progress.configureProgress({
    now: () => NOW,
    timeZone: () => 'UTC',
    periodOf: () => '2026-10-03:morning',
  })
})

afterEach(() => reset())

describe('rows and their circles', () => {
  it('has nothing without a plan', () => {
    const { result } = render({ planned: null, replayTour: false })
    expect(result.current.now).toEqual([])
    expect(result.current.next).toBeNull()
    expect(result.current.doneToday).toEqual([])
    expect(result.current.paused).toBe(false)
    expect(result.current.checkIn).toBeNull()
  })

  it('gives today rows a circle, with a ring for a counted or a parted item', () => {
    progress.addCount('tasbih-after-prayer', 12)
    const { result } = render()
    const [witr, tasbih, adhkar] = result.current.now
    expect(witr?.mark).toEqual({ done: false, progress: null })
    expect(tasbih?.mark?.progress).toEqual({ kind: 'count', value: 12, total: 33 })
    expect(adhkar?.mark?.progress?.kind).toBe('parts')
    expect(result.current.allDay[0]?.mark).toEqual({ done: false, progress: null })
    expect(result.current.tomorrow[0]?.mark).toBeNull()
    expect(result.current.next?.before.map((entry) => entry.id)).toEqual(['witr'])
    expect(result.current.next?.after[0]?.mark?.progress?.value).toBe(12)
  })

  it('lists what is done today, ticked, without the look-ahead', () => {
    const { result } = render({
      planned: planWith({
        done: [item('witr'), { ...item('fast-monday', 'upcoming'), daysAway: 1 }],
      }),
      replayTour: false,
    })
    expect(result.current.doneToday).toEqual([
      expect.objectContaining({ id: 'witr', mark: { done: true, progress: null } }),
    ])
  })

  it('keeps a row for an unknown item as it is', () => {
    const { result } = render({
      planned: planWith({
        next: { prayer: 'asr', jumuah: false, startsAt: NOW, before: [], after: [] },
      }),
      replayTour: false,
    })
    expect(result.current.next?.before).toEqual([])
  })
})

describe('marking', () => {
  it('marks an item done in one go, offers undo, and undo takes it back', () => {
    const { result } = render()
    act(() => result.current.onCircle('witr'))
    expect(allActions()).toMatchObject([{ kind: 'item-completed', subject: 'witr' }])
    expect(result.current.undo).toMatchObject({ id: 'witr#1', title: expect.any(String) })

    act(() => result.current.undo?.onUndo())
    expect(allActions().at(-1)).toMatchObject({ kind: 'item-uncompleted', subject: 'witr' })
    expect(result.current.undo).toBeNull()
  })

  it('a new mark restarts the undo bar; dismissing clears it', () => {
    const { result } = render()
    act(() => result.current.onCircle('witr'))
    act(() => result.current.onCircle('nonexistent'))
    act(() => result.current.onCircle('duha-prayer'))
    expect(result.current.undo?.id).toBe('duha-prayer#2')
    act(() => result.current.onDismissUndo())
    expect(result.current.undo).toBeNull()
  })

  it('unmarks a done row, and leaves an unrelated undo alone', () => {
    const { result, rerender } = render()
    act(() => result.current.onCircle('duha-prayer'))
    rerender({ planned: planWith({ done: [item('witr')] }), replayTour: false })
    act(() => result.current.onCircle('witr'))
    expect(allActions().at(-1)).toMatchObject({ kind: 'item-uncompleted', subject: 'witr' })
    expect(result.current.undo?.title).toBeDefined()
  })

  it('moves an up-next row completed earlier to Done today', () => {
    const { result, rerender } = render({ planned: planWith({}), replayTour: false })
    act(() => result.current.onCircle('witr'))
    rerender({
      planned: planWith({
        next: { prayer: 'dhuhr', jumuah: false, startsAt: NOW, before: ['witr'], after: [] },
      }),
      replayTour: false,
    })
    expect(result.current.next?.before).toEqual([])
    expect(result.current.doneToday.map((entry) => entry.id)).toEqual(['witr'])
    expect(result.current.doneToday[0]?.mark?.done).toBe(true)
  })
})

describe('done today', () => {
  it('lists a row done both now and up next once', () => {
    const { result, rerender } = render({ planned: planWith({}), replayTour: false })
    act(() => result.current.onCircle('witr'))
    rerender({
      planned: planWith({
        done: [item('witr')],
        next: { prayer: 'dhuhr', jumuah: false, startsAt: NOW, before: ['witr'], after: [] },
      }),
      replayTour: false,
    })
    expect(result.current.doneToday.map((entry) => entry.id)).toEqual(['witr'])
  })
})

describe('panels', () => {
  it('counts in the counter, and completes and closes at the target', () => {
    const { result } = render()
    act(() => result.current.onCircle('tasbih-after-prayer'))
    expect(result.current.panel).toMatchObject({ kind: 'count', count: 0, target: 33 })

    act(() => result.current.onCount('tasbih-after-prayer'))
    expect(result.current.panel).toMatchObject({ count: 1 })
    expect(result.current.now[1]?.mark?.progress?.value).toBe(1)

    act(() => {
      progress.addCount('tasbih-after-prayer', 31)
    })
    act(() => result.current.onCount('tasbih-after-prayer'))
    expect(result.current.panel).toBeNull()
    expect(allActions()).toMatchObject([{ kind: 'item-completed' }])
    expect(result.current.undo?.id).toBe('tasbih-after-prayer#1')
  })

  it('completes when the counter reports its target, once', () => {
    const { result, rerender } = render()
    act(() => result.current.onCircle('tasbih-after-prayer'))
    act(() => result.current.onComplete('tasbih-after-prayer'))
    expect(result.current.panel).toBeNull()
    expect(allActions()).toHaveLength(1)

    rerender({ planned: planWith({ done: [item('tasbih-after-prayer')] }), replayTour: false })
    act(() => result.current.onComplete('tasbih-after-prayer'))
    expect(allActions()).toHaveLength(1)
  })

  it('ticks parts off, untick one, and completes when every part is said', () => {
    const { result } = render()
    act(() => result.current.onCircle('morning-adhkar'))
    const panel = result.current.panel
    if (panel?.kind !== 'parts') throw new Error('expected the parts panel')
    const [first, ...rest] = panel.parts
    if (!first) throw new Error('no parts')

    act(() => result.current.onTogglePart('morning-adhkar', first.id))
    expect(result.current.panel?.kind === 'parts' && result.current.panel.parts[0]?.done).toBe(true)
    act(() => result.current.onTogglePart('morning-adhkar', first.id))
    expect(result.current.panel?.kind === 'parts' && result.current.panel.parts[0]?.done).toBe(
      false,
    )

    for (const part of [first, ...rest]) {
      act(() => result.current.onTogglePart('morning-adhkar', part.id))
    }
    expect(result.current.panel).toBeNull()
    expect(allActions()).toMatchObject([{ kind: 'item-completed', subject: 'morning-adhkar' }])
  })

  it('marks all done from a sheet, and closes without marking', () => {
    const { result } = render()
    act(() => result.current.onCircle('morning-adhkar'))
    act(() => result.current.onClosePanel())
    expect(result.current.panel).toBeNull()
    expect(allActions()).toEqual([])

    act(() => result.current.onCircle('morning-adhkar'))
    act(() => result.current.onCircle('witr'))
    expect(result.current.panel?.itemId).toBe('morning-adhkar')
    act(() => result.current.onMarkAll('morning-adhkar'))
    expect(result.current.panel).toBeNull()
    expect(result.current.undo?.id).toBe('morning-adhkar#2')
  })

  it('ignores progress on an item content no longer has', () => {
    const { result } = render()
    act(() => result.current.onTogglePart('gone', 'part'))
    act(() => result.current.onMarkAll('gone'))
    expect(result.current.undo?.title).toBe('gone')
  })
})

describe('the prayer hint', () => {
  it('stops after a few marked prayers, and while paused', () => {
    const { result } = render()
    expect(result.current.prayerHint).toBe(true)
    for (let index = 0; index < hints.PRAYER_HINT_MARKS + 1; index += 1) {
      act(() => result.current.notePrayerMarked())
    }
    expect(result.current.prayerHint).toBe(false)
    expect(hints.getTodayHints().prayersMarked).toBe(hints.PRAYER_HINT_MARKS)
  })
})

describe('the tour', () => {
  it('shows once after onboarding, and Skip ends it for good', () => {
    const { result } = render()
    expect(result.current.tour).toBeNull()

    act(() => setOnboarding({ completed: true, gender: 'unspecified' }))
    expect(result.current.tour?.step).toBe(0)
    act(() => result.current.tour?.onSkip())
    expect(result.current.tour).toBeNull()
    expect(hints.getTodayHints().tourSeen).toBe(true)
    expect(onTourEnd).toHaveBeenCalledTimes(1)
  })

  it('moves on when the prayer is marked or Next is pressed, and ends after the last', () => {
    setOnboarding({ completed: true, gender: 'unspecified' })
    const { result } = render()
    act(() => result.current.notePrayerMarked())
    expect(result.current.tour?.step).toBe(1)
    act(() => result.current.notePrayerMarked())
    expect(result.current.tour?.step).toBe(1)
    act(() => result.current.tour?.onNext())
    expect(result.current.tour?.step).toBe(2)
    act(() => result.current.tour?.onNext())
    expect(result.current.tour).toBeNull()
    expect(onTourEnd).toHaveBeenCalledTimes(1)
  })

  it('replays from the start when asked, again after it ended', () => {
    hints.setTourSeen()
    const { result, rerender } = render({ planned: open, replayTour: true })
    expect(result.current.tour?.step).toBe(0)
    act(() => result.current.tour?.onNext())
    act(() => result.current.tour?.onSkip())
    expect(result.current.tour).toBeNull()

    // The route drops ?tour=1, then Show me around sets it again.
    rerender({ planned: open, replayTour: false })
    expect(result.current.tour).toBeNull()
    rerender({ planned: open, replayTour: true })
    expect(result.current.tour?.step).toBe(0)
  })
})

describe('the pause', () => {
  it('says paused, and offers the check-in once it is due', () => {
    setUserState({ ...getUserState(), trackingPaused: true, pauseCheckInOn: '2026-10-03' })
    const { result } = render({
      planned: planWith({ pausedNotice: { fastingResumes: false }, checkInDue: true }),
      replayTour: false,
    })
    expect(result.current.paused).toBe(true)
    expect(result.current.prayerHint).toBe(false)

    act(() => result.current.checkIn?.onNotYet())
    expect(getUserState().pauseCheckInOn).toBe('2026-10-04')
    act(() => result.current.checkIn?.onResume())
    expect(getUserState().trackingPaused).toBe(false)
  })
})
