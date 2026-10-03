import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { type RenderResult, render } from '@testing-library/react'
import { defaultCityFor } from './cities'
import { CoachOverlay, coachMarkIsTarget } from './coach'
import { demoCopyFor } from './demo-strings'
import { buildSignals, buildToday, DEFAULT_ENABLED, type DemoToday } from './engine'

const place = defaultCityFor('Asia/Riyadh')
const user = { marks: {}, completed: {}, enabled: DEFAULT_ENABLED }
// 13:00 in Makkah: Dhuhr is current, Fajr has passed.
const MIDDAY = new Date(Date.UTC(2026, 8, 30, 10, 0))

function todayWith(marks: Record<string, Date> = {}, at = MIDDAY): DemoToday {
  return buildToday(buildSignals(place, at, { ...user, marks }), en, 'en-US', 'Makkah')
}

const copy = demoCopyFor('en')

describe('coachMarkIsTarget', () => {
  test('the current, unmarked prayer is the target while the step is "mark"', () => {
    const today = todayWith()
    expect(coachMarkIsTarget('mark', today, 'dhuhr')).toBe(true)
    expect(coachMarkIsTarget('mark', today, 'asr')).toBe(false)
  })

  test('once the current prayer is marked, the latest passed unmarked one is', () => {
    const today = todayWith({ dhuhr: MIDDAY })
    expect(coachMarkIsTarget('mark', today, 'dhuhr')).toBe(false)
    expect(coachMarkIsTarget('mark', today, 'fajr')).toBe(true)
  })

  test('with nothing to mark, the step reads as "open" and no prayer is the target', () => {
    const today = todayWith({ fajr: MIDDAY, dhuhr: MIDDAY })
    expect(coachMarkIsTarget('mark', today, 'fajr')).toBe(false)
    expect(coachMarkIsTarget('mark', today, 'dhuhr')).toBe(false)
  })

  test('"open" and "done" never target a prayer', () => {
    const today = todayWith()
    expect(coachMarkIsTarget('open', today, 'dhuhr')).toBe(false)
    expect(coachMarkIsTarget('done', today, 'dhuhr')).toBe(false)
  })
})

// --- the overlay, with the layout the browser would measure ---

interface Box {
  top: number
  start: number
  width: number
  height: number
}

function rect({ top, start, width, height }: Box): DOMRect {
  return new DOMRect(start, top, width, height)
}

function place_(element: Element, box: Box): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect(box),
    configurable: true,
  })
}

interface Scene {
  content: HTMLDivElement
  tabbar: HTMLDivElement
  scroller: HTMLDivElement
  chip: HTMLElement
  card: HTMLElement
  library: HTMLElement
}

function scene(today = todayWith()): Scene {
  const content = document.createElement('div')
  const scroller = document.createElement('div')
  scroller.style.overflowY = 'auto'
  const chip = document.createElement('button')
  chip.dataset.testid = 'prayer-dhuhr'
  chip.setAttribute('data-testid', 'prayer-dhuhr')
  const card = document.createElement('div')
  card.setAttribute('data-testid', `circle-${today.props.now[0]?.id}`)
  scroller.append(chip, card)
  content.append(scroller)
  const tabbar = document.createElement('div')
  const library = document.createElement('button')
  library.setAttribute('data-demo-tab', 'library')
  tabbar.append(library)
  document.body.append(content, tabbar)
  place_(scroller, { top: 100, start: 50, width: 300, height: 500 })
  place_(content, { top: 100, start: 50, width: 300, height: 500 })
  place_(tabbar, { top: 700, start: 50, width: 300, height: 60 })
  place_(chip, { top: 200, start: 150, width: 100, height: 40 })
  place_(card, { top: 300, start: 60, width: 200, height: 80 })
  place_(library, { top: 710, start: 200, width: 40, height: 40 })
  Object.defineProperty(scroller, 'clientWidth', { value: 300, configurable: true })
  Object.defineProperty(tabbar, 'clientWidth', { value: 300, configurable: true })
  return { content, tabbar, scroller, chip, card, library }
}

const offsets = {
  height: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
  width: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    get: () => 30,
    configurable: true,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get: () => 120,
    configurable: true,
  })
})
afterEach(() => {
  if (offsets.height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsets.height)
  if (offsets.width) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsets.width)
  document.body.innerHTML = ''
})

function overlay(s: Scene, step: 'mark' | 'open' | 'done', today = todayWith()): RenderResult {
  const contentRef = { current: s.content }
  const tabbarRef = { current: s.tabbar }
  return render(
    <CoachOverlay
      contentRef={contentRef}
      tabbarRef={tabbarRef}
      step={step}
      today={today}
      copy={copy}
    />,
  )
}

function vars(element: Element, names: string[]): string[] {
  return names.map((name) => (element as HTMLElement).style.getPropertyValue(name))
}

describe('CoachOverlay', () => {
  test('"mark": rings the current prayer chip and says what to do, inside its scroll view', () => {
    const s = scene()
    overlay(s, 'mark')
    const bubble = s.scroller.querySelector('#demo-coach-bubble') as HTMLElement
    expect(bubble).toHaveTextContent('Tap to mark Dhuhr as prayed')
    expect(bubble).toHaveAttribute('role', 'note')
    expect(s.chip).toHaveAttribute('aria-describedby', 'demo-coach-bubble')
    const ring = s.scroller.querySelector('.demo-coach-ring') as HTMLElement
    // The chip sits 100px below and 100px right of its scroll view; the ring is 4px larger on each side.
    expect(
      vars(ring, [
        '--demo-coach-ring-top',
        '--demo-coach-ring-left',
        '--demo-coach-ring-width',
        '--demo-coach-ring-height',
        '--demo-coach-ring-radius',
      ]),
    ).toEqual(['96px', '96px', '108px', '48px', '0.85rem'])
  })

  test('the bubble sits below the target, centred on it, with the arrow on the target', () => {
    const s = scene()
    overlay(s, 'mark')
    const bubble = s.scroller.querySelector('#demo-coach-bubble') as HTMLElement
    expect(bubble).not.toHaveClass('demo-coach-bubble-above')
    expect(
      vars(bubble, [
        '--demo-coach-bubble-left',
        '--demo-coach-bubble-top',
        '--demo-coach-arrow-left',
      ]),
    ).toEqual(['90px', '150px', '60px'])
  })

  test('the bubble goes above a target near the bottom of its view', () => {
    const s = scene()
    place_(s.chip, { top: 560, start: 150, width: 100, height: 30 })
    overlay(s, 'mark')
    const bubble = s.scroller.querySelector('#demo-coach-bubble') as HTMLElement
    expect(bubble).toHaveClass('demo-coach-bubble-above')
    // 460px of the view above the target, 30px bubble and a 10px gap.
    expect(vars(bubble, ['--demo-coach-bubble-top'])).toEqual(['420px'])
  })

  test('the bubble is kept inside the view at either edge', () => {
    const s = scene()
    place_(s.chip, { top: 200, start: 50, width: 20, height: 40 })
    const left = overlay(s, 'mark')
    expect(
      vars(left.container.ownerDocument.querySelector('#demo-coach-bubble') as Element, [
        '--demo-coach-bubble-left',
        '--demo-coach-arrow-left',
      ]),
    ).toEqual(['8px', '12px'])
    left.unmount()
    place_(s.chip, { top: 200, start: 340, width: 20, height: 40 })
    overlay(s, 'mark')
    // 300 wide view, 120 wide bubble, 8px margin: at most 172px from the start.
    expect(
      vars(document.querySelector('#demo-coach-bubble') as Element, ['--demo-coach-bubble-left']),
    ).toEqual(['172px'])
  })

  test('the ring takes the corner radius of the target or of its first child', () => {
    const s = scene()
    s.chip.style.borderRadius = '12px'
    overlay(s, 'mark')
    expect(
      vars(document.querySelector('.demo-coach-ring') as Element, ['--demo-coach-ring-radius']),
    ).toEqual(['12px'])
  })

  test('the radius can come from the child inside an unrounded pressable', () => {
    const s = scene()
    const inner = document.createElement('div')
    inner.style.borderRadius = '20px'
    s.chip.append(inner)
    overlay(s, 'mark')
    expect(
      vars(document.querySelector('.demo-coach-ring') as Element, ['--demo-coach-ring-radius']),
    ).toEqual(['20px'])
  })

  test('"open" rings the circle of the first Right now item', () => {
    const s = scene()
    overlay(s, 'open')
    expect(s.scroller.querySelector('#demo-coach-bubble')).toHaveTextContent(copy.coachTapCircle)
    expect(s.card).toHaveAttribute('aria-describedby', 'demo-coach-bubble')
  })

  test('"open" with no card points at the Library tab, in the tab bar', () => {
    const s = scene()
    const today = todayWith()
    overlay(s, 'open', { ...today, props: { ...today.props, now: [] } })
    expect(s.tabbar.querySelector('#demo-coach-bubble')).toHaveTextContent(copy.coachOpenLibrary)
    expect(s.library).toHaveAttribute('aria-describedby', 'demo-coach-bubble')
  })

  test('a "mark" step with nothing to mark falls through to "open"', () => {
    const today = todayWith({ fajr: MIDDAY, dhuhr: MIDDAY })
    const s = scene(today)
    overlay(s, 'mark', today)
    expect(s.scroller.querySelector('#demo-coach-bubble')).toHaveTextContent(copy.coachTapCircle)
  })

  test('"done" draws nothing', () => {
    const s = scene()
    overlay(s, 'done')
    expect(document.querySelector('.demo-coach-ring')).toBeNull()
    expect(s.chip).not.toHaveAttribute('aria-describedby')
  })

  test('draws nothing when the target is not on screen', () => {
    const s = scene()
    s.chip.remove()
    overlay(s, 'mark')
    expect(document.querySelector('.demo-coach-ring')).toBeNull()
  })

  test('draws nothing without its containers', () => {
    const s = scene()
    render(
      <CoachOverlay
        contentRef={{ current: null }}
        tabbarRef={{ current: s.tabbar }}
        step="mark"
        today={todayWith()}
        copy={copy}
      />,
    )
    expect(document.querySelector('.demo-coach-ring')).toBeNull()
  })

  test('removes its description from the target when it goes away', () => {
    const s = scene()
    const view = overlay(s, 'mark')
    expect(s.chip).toHaveAttribute('aria-describedby')
    view.unmount()
    expect(s.chip).not.toHaveAttribute('aria-describedby')
  })

  test('falls back to the content when the target has no scroll view', () => {
    const s = scene()
    s.scroller.style.overflowY = 'visible'
    overlay(s, 'mark')
    expect(s.content.querySelector('#demo-coach-bubble')).not.toBeNull()
  })
})
