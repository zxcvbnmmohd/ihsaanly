// A guided coach mark for first-time visitors: test users didn't realise the
// phone demo is interactive, and the hero's "Try it right here…" line wasn't
// enough. This draws a pulsing ring and a speech bubble at the one control
// worth tapping next, in three steps:
//
//   1. "mark"  — the prayer chip whose window is current, or the most recent
//                unmarked one, is ringed: "Tap to mark {prayer} as prayed".
//   2. "open"  — after a mark (or if step 1 had nothing to point at), the
//                first "Right now" item card is ringed, or the Library tab
//                when there is no card.
//   3. "done"  — the visitor opened an item, tapped anything that wasn't the
//                current target, or used the tab bar. The coach never
//                reappears for the rest of the page view.
//
// State lives here, in memory only, mirroring state.ts's single-object
// convention — there is nothing to persist across a reload.

import type { TodayViewModel } from './engine'
import type { DemoCopy } from './demo-strings'
import type { Prayer } from '@/prayer/qada'

export type CoachStep = 'mark' | 'open' | 'done'

export type CoachTarget =
  | { step: 'mark'; prayer: Prayer }
  | { step: 'open'; kind: 'item'; itemId: string }
  | { step: 'open'; kind: 'library' }

interface CoachState {
  step: CoachStep
}

let coach: CoachState = { step: 'mark' }

/** The target handed back by the most recent `coachTarget` call, so a tap can tell whether it landed on it. */
let lastTarget: CoachTarget | null = null

/** The current window's prayer if it's still unmarked, else the most recent started-and-unmarked one. */
function markCandidate(today: TodayViewModel): Prayer | null {
  const current = today.prayers.find((entry) => entry.prayer === today.currentPrayer)
  if (current && !current.done) return current.prayer

  const startedUnmarked = today.prayers.filter(
    (entry) => !entry.done && (entry.passed || entry.prayer === today.currentPrayer),
  )
  const mostRecent = startedUnmarked[startedUnmarked.length - 1]
  return mostRecent ? mostRecent.prayer : null
}

/**
 * Recomputes what the coach should point at, given the freshly-built Today
 * model, and remembers it so the next tap can tell whether it hit the
 * target. Call once per render, only while the Today tab is showing — this
 * is also where a "mark" step with nothing to ring quietly becomes "open".
 */
export function coachTarget(today: TodayViewModel): CoachTarget | null {
  if (coach.step === 'done') {
    lastTarget = null
    return null
  }

  if (coach.step === 'mark') {
    const prayer = markCandidate(today)
    if (prayer) {
      lastTarget = { step: 'mark', prayer }
      return lastTarget
    }
    coach = { step: 'open' }
  }

  lastTarget = today.rightNow
    ? { step: 'open', kind: 'item', itemId: today.rightNow.id }
    : { step: 'open', kind: 'library' }
  return lastTarget
}

export function coachHandleMarkPrayer(prayer: Prayer): void {
  if (coach.step === 'done') return
  const isTarget = lastTarget !== null && lastTarget.step === 'mark' && lastTarget.prayer === prayer
  coach = isTarget ? { step: 'open' } : { step: 'done' }
}

/** Opening any item — the ringed one or another the visitor found on their own — ends the coach. */
export function coachHandleOpenItem(): void {
  if (coach.step !== 'done') coach = { step: 'done' }
}

/** Using the tab bar, including tapping the ringed Library tab, ends the coach. */
export function coachHandleSelectTab(): void {
  if (coach.step !== 'done') coach = { step: 'done' }
}

const RING_ID = 'demo-coach-ring'
const BUBBLE_ID = 'demo-coach-bubble'

export interface CoachRefs {
  contentEl: HTMLElement
  tabbarEl: HTMLElement
}

function hostFor(target: CoachTarget, refs: CoachRefs): HTMLElement {
  return target.step === 'open' && target.kind === 'library' ? refs.tabbarEl : refs.contentEl
}

function findTargetElement(target: CoachTarget, refs: CoachRefs): HTMLElement | null {
  if (target.step === 'mark') {
    return refs.contentEl.querySelector<HTMLElement>(`[data-prayer="${target.prayer}"]`)
  }
  if (target.kind === 'item') {
    return refs.contentEl.querySelector<HTMLElement>('.demo-card-right-now')
  }
  return refs.tabbarEl.querySelector<HTMLElement>('[data-demo-tab="library"]')
}

function bubbleText(target: CoachTarget, today: TodayViewModel, copy: DemoCopy): string {
  if (target.step === 'mark') {
    const name = today.prayers.find((entry) => entry.prayer === target.prayer)?.name ?? ''
    return copy.coachMarkPrayer(name)
  }
  return target.kind === 'item' ? copy.coachOpenItem : copy.coachOpenLibrary
}

/**
 * Renders the ring + bubble for the current step, or clears any previous
 * one when there is nothing to point at. `refs.contentEl` and
 * `refs.tabbarEl` must already hold this render's fresh content — call this
 * after `renderToday`/`renderTabBar`, and after the scroll position has been
 * restored, since the bubble is placed from the target's live layout.
 */
export function renderCoach(refs: CoachRefs, today: TodayViewModel, copy: DemoCopy): void {
  const target = coachTarget(today)
  if (!target) return

  const targetEl = findTargetElement(target, refs)
  if (!targetEl) return

  const host = hostFor(target, refs)
  const hostRect = host.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()

  const top = targetRect.top - hostRect.top + host.scrollTop
  const left = targetRect.left - hostRect.left + host.scrollLeft

  const ringPad = 4
  const ring = document.createElement('div')
  ring.id = RING_ID
  ring.className = 'demo-coach-ring'
  const targetRadius = window.getComputedStyle(targetEl).borderRadius
  ring.style.borderRadius = targetRadius && targetRadius !== '0px' ? targetRadius : '0.85rem'
  ring.style.top = `${top - ringPad}px`
  ring.style.left = `${left - ringPad}px`
  ring.style.width = `${targetRect.width + ringPad * 2}px`
  ring.style.height = `${targetRect.height + ringPad * 2}px`
  host.appendChild(ring)

  const bubble = document.createElement('div')
  bubble.id = BUBBLE_ID
  bubble.className = 'demo-coach-bubble'
  bubble.setAttribute('role', 'note')
  bubble.textContent = bubbleText(target, today, copy)
  host.appendChild(bubble)

  const gap = 10
  const margin = 8
  const hostWidth = host.clientWidth
  const spaceBelow = hostRect.bottom - targetRect.bottom
  const spaceAbove = targetRect.top - hostRect.top
  const showAbove = spaceBelow < bubble.offsetHeight + gap && spaceAbove > spaceBelow

  let bubbleLeft = left + targetRect.width / 2 - bubble.offsetWidth / 2
  bubbleLeft = Math.max(margin, Math.min(bubbleLeft, hostWidth - bubble.offsetWidth - margin))
  const bubbleTop = showAbove ? top - bubble.offsetHeight - gap : top + targetRect.height + gap

  bubble.style.left = `${bubbleLeft}px`
  bubble.style.top = `${bubbleTop}px`
  bubble.classList.toggle('demo-coach-bubble-above', showAbove)

  const targetCenter = left + targetRect.width / 2
  const arrowLeft = Math.max(12, Math.min(targetCenter - bubbleLeft, bubble.offsetWidth - 12))
  bubble.style.setProperty('--demo-coach-arrow-left', `${arrowLeft}px`)

  targetEl.setAttribute('aria-describedby', BUBBLE_ID)
}
