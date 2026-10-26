import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { itemById, resolveText } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import { act, renderHook } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { renderScreen } from '../../../../../../../packages/ui/test/render'
import '../../../../../test/library'
import { router } from '../../../../../test/router'

type ReaderProps = ComponentProps<typeof import('@ihsaanly/ui/screens/reader').ReaderScreen>

const readerProps: ReaderProps[] = []
mock.module('@ihsaanly/ui/screens/reader', () => ({
  ReaderScreen: (props: ReaderProps): ReactElement => {
    readerProps.push(props)
    return <div data-testid="reader-screen" />
  },
}))

const haptics: string[] = []
mock.module('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
  notificationAsync: async (type: string) => void haptics.push(`notification:${type}`),
  impactAsync: async (style: string) => void haptics.push(`impact:${style}`),
}))

const { default: ReaderRoute } = await import('../../../../app/(library)/item/read/[id]')
const { expoRouter } = await import('../../../../../test/router')
const { uncompleteItem, useCompletedToday } = await import('@ihsaanly/state/plan/completions')
const { clearProgress, getItemProgress } = await import('@ihsaanly/state/progress/store')
const tours = await import('@ihsaanly/state/coach/tours')

const TASBIH = 'tasbih-after-prayer'
const MORNING = 'morning-adhkar'
const LEAVING = 'dua-leaving-home'

const last = (): ReaderProps => {
  const props = readerProps.at(-1)
  if (!props) throw new Error('ReaderScreen did not render')
  return props
}

function open(id: string): void {
  router.params = { id }
  renderScreen(<ReaderRoute />)
}

/** Whether the item is recorded done today, as the item screen would read it. */
function doneRecorded(id: string): boolean {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { result } = renderHook(() => useCompletedToday(zone, new Date()))
  return result.current[id] !== undefined
}

beforeEach(() => {
  readerProps.length = 0
  haptics.length = 0
})

afterEach(() => {
  act(() => {
    for (const id of [TASBIH, MORNING, LEAVING]) {
      uncompleteItem(id, new Date(), 'UTC')
      clearProgress(id)
    }
  })
  expoRouter.router.canGoBack = () => true
})

describe('an unknown item', () => {
  it('has nothing to read, and Done only closes', () => {
    open('no-such-item')
    expect(last().title).toBe(en.notFound.title)
    expect(last().pages).toEqual([])
    expect(last().counter).toBeNull()
    act(() => last().onTapCounter())
    act(() => last().onDone())
    expect(haptics).toEqual([])
    expect(router.calls).toEqual([['back']])
  })
})

describe('a single dua', () => {
  it('is one page of Arabic, transliteration and translation, with no counter', () => {
    open(LEAVING)
    const item = itemById(LEAVING)
    expect(last().title).toBe(resolveText(item?.title ?? null) ?? '')
    expect(last().pages).toEqual([
      {
        id: LEAVING,
        title: null,
        arabic: item?.arabic ?? '',
        transliteration: resolveText(item?.transliteration ?? null),
        translation: resolveText(item?.translation ?? null),
      },
    ])
    expect(last().counter).toBeNull()
    expect(router.screens).toEqual([{ title: last().title, headerLargeTitleEnabled: false }])
  })

  it('marks it done and closes on Done', () => {
    open(LEAVING)
    act(() => last().onDone())
    expect(doneRecorded(LEAVING)).toBe(true)
    expect(haptics).toEqual(['notification:success'])
    expect(router.calls).toEqual([['back']])
  })

  it('goes home when there is nothing to go back to', () => {
    expoRouter.router.canGoBack = () => false
    open(LEAVING)
    act(() => last().onDone())
    expect(router.calls).toEqual([['replace', '/']])
  })

  it('opens the full item screen in its place for more', () => {
    open(LEAVING)
    act(() => last().onMore())
    expect(router.calls).toEqual([['replace', `/item/${LEAVING}`]])
  })
})

describe('a repeated dhikr', () => {
  it('counts through the progress store and completes at the target', () => {
    open(TASBIH)
    const target = itemById(TASBIH)?.repeat ?? 0
    expect(last().counter).toEqual({ count: 0, target })
    act(() => last().onTapCounter())
    act(() => last().onTapCounter())
    expect(last().counter?.count).toBe(2)
    expect(getItemProgress(TASBIH).count).toBe(2)
    expect(haptics).toEqual(['impact:light', 'impact:light'])

    for (let tap = 2; tap < target; tap += 1) act(() => last().onTapCounter())
    expect(doneRecorded(TASBIH)).toBe(true)
    expect(last().counter).toEqual({ count: target, target })
    expect(haptics.at(-1)).toBe('notification:success')

    // Done now only closes: the completion is already recorded.
    haptics.length = 0
    act(() => last().onDone())
    expect(haptics).toEqual([])
    expect(router.calls).toEqual([['back']])
  })

  it('picks up a count started elsewhere', () => {
    open(TASBIH)
    act(() => last().onTapCounter())
    readerProps.length = 0
    open(TASBIH)
    expect(last().counter?.count).toBe(1)
  })
})

describe('adhkar in parts', () => {
  it('pages through each part, recording one said once on moving on', () => {
    open(MORNING)
    const parts = itemById(MORNING)?.parts ?? []
    expect(last().pages.map((page) => page.id)).toEqual(parts.map((part) => part.id))
    expect(last().page).toBe(0)

    const first = parts[0]
    act(() => last().onPage(1))
    expect(last().page).toBe(1)
    if (first && first.repeat <= 1) expect(getItemProgress(MORNING).parts).toContain(first.id)

    // Going back records nothing more.
    const before = getItemProgress(MORNING).parts
    act(() => last().onPage(0))
    expect(getItemProgress(MORNING).parts).toEqual(before)
  })

  it('counts a repeated part and records it at its count', () => {
    open(MORNING)
    const parts = itemById(MORNING)?.parts ?? []
    const index = parts.findIndex((part) => part.repeat > 1)
    const part = parts[index]
    if (!part) throw new Error('the morning adhkar have a repeated part')
    act(() => last().onPage(index))
    expect(last().counter).toEqual({ count: 0, target: part.repeat })
    act(() => last().onTapCounter())
    expect(last().counter?.count).toBe(1)
    expect(haptics).toEqual(['impact:light'])
    for (let tap = 1; tap < part.repeat; tap += 1) act(() => last().onTapCounter())
    expect(getItemProgress(MORNING).parts).toContain(part.id)
    expect(last().counter).toEqual({ count: part.repeat, target: part.repeat })
    expect(haptics.at(-1)).toBe('notification:success')
    expect(doneRecorded(MORNING)).toBe(false)
  })

  it('has no counter on a part said once', () => {
    open(MORNING)
    const parts = itemById(MORNING)?.parts ?? []
    const index = parts.findIndex((part) => part.repeat <= 1)
    act(() => last().onPage(index))
    expect(last().counter).toBeNull()
  })

  it('completes when the last repeated part finishes the set', () => {
    open(MORNING)
    const parts = itemById(MORNING)?.parts ?? []
    // Paging past each part from the start says the ones said once.
    for (let page = 1; page < parts.length; page += 1) act(() => last().onPage(page))
    parts.forEach((part, index) => {
      if (part.repeat <= 1) return
      act(() => last().onPage(index))
      for (let tap = 0; tap < part.repeat; tap += 1) act(() => last().onTapCounter())
    })
    expect(doneRecorded(MORNING)).toBe(true)
    // Done, every part reads as said.
    const repeated = parts.findIndex((part) => part.repeat > 1)
    act(() => last().onPage(repeated))
    expect(last().counter?.count).toBe(parts[repeated]?.repeat)
    // And paging on no longer records anything.
    act(() => last().onPage(repeated + 1))
    expect(getItemProgress(MORNING)).toEqual({ count: 0, parts: [] })
  })

  it('marks every part done at once on Done', () => {
    open(MORNING)
    act(() => last().onDone())
    expect(doneRecorded(MORNING)).toBe(true)
    expect(getItemProgress(MORNING)).toEqual({ count: 0, parts: [] })
  })
})

describe('the first-use tour', () => {
  beforeEach(() => act(() => tours.resetCoachTours()))
  afterEach(() => act(() => tours.markCoachTourSeen('reader')))

  it('points at the counter, Done, then More about this, and is seen once finished', () => {
    open(TASBIH)
    expect(last().coach).toMatchObject({ target: 'counter', step: 0, total: 3 })
    // Counting is the tip taken.
    act(() => last().onTapCounter())
    expect(last().coach).toMatchObject({ target: 'done', step: 1 })
    act(() => last().coach?.onNext())
    expect(last().coach).toMatchObject({ target: 'more', step: 2 })
    act(() => last().coach?.onNext())
    expect(last().coach).toBeNull()

    readerProps.length = 0
    open(TASBIH)
    expect(last().coach).toBeNull()
  })

  it('skips the counter for something said once, and Skip ends it', () => {
    open(LEAVING)
    expect(last().coach).toMatchObject({ target: 'done', step: 0, total: 2 })
    act(() => last().coach?.onSkip())
    expect(last().coach).toBeNull()
  })

  it('shows nothing with nothing to read', () => {
    open('no-such-item')
    expect(last().coach).toBeNull()
  })
})
