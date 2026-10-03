// A guided coach mark for first-time visitors: test users didn't realise the
// phone demo is interactive, and the hero's "Try it right here…" line wasn't
// enough. This draws a pulsing ring and a speech bubble at the one control
// worth tapping next, in three steps:
//
//   1. "mark"  — the prayer chip whose window is current, or the most recent
//                unmarked one, is ringed: "Tap to mark {prayer} as prayed".
//   2. "open"  — after a mark (or if step 1 had nothing to point at), the
//                circle of the first "Right now" item is ringed ("Tap the
//                circle when you've done it"), or the Library tab when there
//                is no card.
//   3. "done"  — the visitor tapped a circle, opened an item, tapped anything that wasn't the
//                current target, or used the tab bar. The coach never
//                reappears for the rest of the page view.
//
// `coachStep` lives in state.ts's reducer now (it is user-driven, persisted
// state); this module holds the pure decisions — what to point at, whether a
// tap hit it — and the overlay that measures the live layout and draws the
// ring and bubble. The ring/bubble are positioned from measured pixels, so
// they are portalled into whichever container the target lives in
// (the screen's scroll view or `.demo-tabbar`, both `position: relative`), the same
// place the old vanilla version appended them, so they scroll with the
// content and never fight the real, tappable control underneath.

import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './class-names'
import type { DemoCopy } from './demo-strings'
import type { DemoToday } from './engine'

export type CoachStep = 'mark' | 'open' | 'done'

type CoachTarget =
  | { step: 'mark'; prayer: Prayer }
  | { step: 'open'; kind: 'item'; itemId: string }
  | { step: 'open'; kind: 'library' }

/** The current window's prayer if it's still unmarked, else the most recent started-and-unmarked one. */
function markCandidate(today: DemoToday): Prayer | null {
  const { prayers } = today.props
  const current = prayers.find((entry) => entry.prayer === today.currentPrayer)
  if (current && !current.done) return current.prayer

  const startedUnmarked = prayers.filter(
    (entry) => !entry.done && (entry.passed || entry.prayer === today.currentPrayer),
  )
  const mostRecent = startedUnmarked[startedUnmarked.length - 1]
  return mostRecent ? mostRecent.prayer : null
}

/**
 * What the coach should point at, given the freshly-built Today model. A
 * "mark" step with nothing to ring quietly reads as "open" here — the same
 * fallback the old module-state version made permanent, reproduced instead
 * as a pure function of the (still "mark") persisted step.
 */
function coachTarget(step: CoachStep, today: DemoToday): CoachTarget | null {
  if (step === 'done') return null

  if (step === 'mark') {
    const prayer = markCandidate(today)
    if (prayer) return { step: 'mark', prayer }
  }

  const [rightNow] = today.props.now
  return rightNow
    ? { step: 'open', kind: 'item', itemId: rightNow.id }
    : { step: 'open', kind: 'library' }
}

/** Whether marking `prayer` right now would hit the coach's current target. */
export function coachMarkIsTarget(step: CoachStep, today: DemoToday, prayer: Prayer): boolean {
  const target = coachTarget(step, today)
  return target !== null && target.step === 'mark' && target.prayer === prayer
}

function bubbleTextFor(target: CoachTarget, today: DemoToday, copy: DemoCopy): string {
  if (target.step === 'mark') {
    return copy.coachMarkPrayer(today.names[target.prayer])
  }
  return target.kind === 'item' ? copy.coachTapCircle : copy.coachOpenLibrary
}

function findTargetElement(
  target: CoachTarget,
  contentEl: HTMLElement,
  tabbarEl: HTMLElement,
): HTMLElement | null {
  if (target.step === 'mark') {
    return contentEl.querySelector<HTMLElement>(`[data-testid="prayer-${target.prayer}"]`)
  }
  if (target.kind === 'item') {
    return contentEl.querySelector<HTMLElement>(`[data-testid="circle-${target.itemId}"]`)
  }
  return tabbarEl.querySelector<HTMLElement>('[data-demo-tab="library"]')
}

/**
 * The shared screens scroll inside their own ScrollView (a div react-native-web
 * renders with `overflow: auto`), so the ring and bubble go into that, not
 * into `.demo-content`, to scroll with the target.
 */
function scrollerOf(targetEl: HTMLElement, contentEl: HTMLElement): HTMLElement {
  for (let el = targetEl.parentElement; el && el !== contentEl; el = el.parentElement) {
    const { overflowY } = window.getComputedStyle(el)
    if (overflowY === 'auto' || overflowY === 'scroll') return el
  }
  return contentEl
}

/** The pressable itself has no corners; the Surface card inside it does. */
function radiusOf(targetEl: HTMLElement): string {
  for (const el of [targetEl, targetEl.firstElementChild]) {
    if (!(el instanceof HTMLElement)) continue
    const radius = window.getComputedStyle(el).borderRadius
    if (radius && radius !== '0px') return radius
  }
  return ''
}

interface Anchor {
  host: HTMLElement
  targetEl: HTMLElement
  top: number
  x: number
  width: number
  height: number
  radius: string
  text: string
  spaceAbove: number
  spaceBelow: number
}

interface BubblePlacement {
  x: number
  top: number
  above: boolean
  arrowLeft: number
}

export interface CoachOverlayProps {
  contentRef: RefObject<HTMLDivElement | null>
  tabbarRef: RefObject<HTMLDivElement | null>
  step: CoachStep
  today: DemoToday
  copy: DemoCopy
}

const RING_PAD = 4
const GAP = 10
const MARGIN = 8
const BUBBLE_ID = 'demo-coach-bubble'

/**
 * Custom properties only: the RTL-logical lint rule forbids `left`/`right`
 * (and their margin/padding/border cousins) as style-object keys, since they
 * read as physical directions. These are plain pixel offsets measured off
 * the live layout, already correct regardless of writing direction, so they
 * are threaded through CSS variables that demo.css's `.demo-coach-ring`/
 * `.demo-coach-bubble` rules consume with `left`/`top` in a plain CSS file
 * (the CSS linter is off; this is exactly the "genuinely needs CSS" case).
 */
function positionVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties
}

export function CoachOverlay(props: CoachOverlayProps): ReactNode {
  const { contentRef, tabbarRef, step, today, copy } = props
  const target = coachTarget(step, today)
  // Plain values for the effect below: `target` and `today` are new objects on
  // every render, and depending on them re-ran the effect, whose setAnchor
  // re-rendered, forever.
  const targetKey = target ? JSON.stringify(target) : ''
  const bubbleText = target ? bubbleTextFor(target, today, copy) : ''
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  interface Thing {
    anchor: Anchor | null
    placement: BubblePlacement | null
  }
  const [thing, setThing] = useState<Thing>({ anchor: null, placement: null })
  const { anchor, placement } = thing

  // biome-ignore lint/correctness/useExhaustiveDependencies: targetKey and bubbleText stand for target and today, and the refs are stable.
  useLayoutEffect(() => {
    const contentEl = contentRef.current
    const tabbarEl = tabbarRef.current
    if (!target || !contentEl || !tabbarEl) {
      setThing((current) => ({ ...current, anchor: null }))
      return
    }

    const targetEl = findTargetElement(target, contentEl, tabbarEl)
    if (!targetEl) {
      setThing((current) => ({ ...current, anchor: null }))
      return
    }

    const host =
      target.step === 'open' && target.kind === 'library'
        ? tabbarEl
        : scrollerOf(targetEl, contentEl)
    const hostRect = host.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    const radius = radiusOf(targetEl)

    setThing((current) => ({
      ...current,
      anchor: {
        host,
        targetEl,
        top: targetRect.top - hostRect.top + host.scrollTop,
        x: targetRect.left - hostRect.left + host.scrollLeft,
        width: targetRect.width,
        height: targetRect.height,
        radius: radius && radius !== '0px' ? radius : '0.85rem',
        text: bubbleText,
        spaceAbove: targetRect.top - hostRect.top,
        spaceBelow: hostRect.bottom - targetRect.bottom,
      },
    }))

    targetEl.setAttribute('aria-describedby', BUBBLE_ID)
    return () => {
      targetEl.removeAttribute('aria-describedby')
    }
  }, [targetKey, bubbleText])

  useLayoutEffect(() => {
    const bubble = bubbleRef.current
    if (!anchor || !bubble) {
      setThing((current) => ({ ...current, placement: null }))
      return
    }

    const showAbove =
      anchor.spaceBelow < bubble.offsetHeight + GAP && anchor.spaceAbove > anchor.spaceBelow
    const hostWidth = anchor.host.clientWidth
    let left = anchor.x + anchor.width / 2 - bubble.offsetWidth / 2
    left = Math.max(MARGIN, Math.min(left, hostWidth - bubble.offsetWidth - MARGIN))
    const top = showAbove
      ? anchor.top - bubble.offsetHeight - GAP
      : anchor.top + anchor.height + GAP
    const targetCenter = anchor.x + anchor.width / 2
    const arrowLeft = Math.max(12, Math.min(targetCenter - left, bubble.offsetWidth - 12))

    setThing((current) => ({
      ...current,
      placement: { x: left, top, above: showAbove, arrowLeft },
    }))
  }, [anchor])

  if (!target || !anchor) return null

  const ringStyle = positionVars({
    '--demo-coach-ring-top': `${anchor.top - RING_PAD}px`,
    '--demo-coach-ring-left': `${anchor.x - RING_PAD}px`,
    '--demo-coach-ring-width': `${anchor.width + RING_PAD * 2}px`,
    '--demo-coach-ring-height': `${anchor.height + RING_PAD * 2}px`,
    '--demo-coach-ring-radius': anchor.radius,
  })

  const bubbleStyle = placement
    ? positionVars({
        '--demo-coach-bubble-left': `${placement.x}px`,
        '--demo-coach-bubble-top': `${placement.top}px`,
        '--demo-coach-arrow-left': `${placement.arrowLeft}px`,
      })
    : positionVars({
        '--demo-coach-bubble-left': `${anchor.x}px`,
        '--demo-coach-bubble-top': `${anchor.top + anchor.height + GAP}px`,
        '--demo-coach-arrow-left': '50%',
        visibility: 'hidden',
      })

  return createPortal(
    <>
      <div className="demo-coach-ring" style={ringStyle} />
      <div
        ref={bubbleRef}
        id={BUBBLE_ID}
        className={cx('demo-coach-bubble', placement?.above && 'demo-coach-bubble-above')}
        role="note"
        style={bubbleStyle}>
        {anchor.text}
      </div>
    </>,
    anchor.host,
  )
}
