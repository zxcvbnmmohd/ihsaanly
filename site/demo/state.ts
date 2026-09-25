// The demo's only mutable state, kept in memory (no storage, no cookies). One
// object, one setter, a handful of subscribers — the browser equivalent of the
// app's "one useState per file" convention.

import type { Place } from '@/location/place'
import type { PrayerMarks } from './engine'

export type DemoTab = 'today' | 'library' | 'more'
export type DemoView = DemoTab | 'item'

export interface DemoState {
  /** Read once from the visitor's time zone. */
  place: Place
  marks: PrayerMarks
  view: DemoView
  /** Where "back" from an item returns to. */
  previousTab: 'today' | 'library'
  selectedItemId: string | null
  libraryQuery: string
}

type Listener = (state: DemoState) => void

let state: DemoState
const listeners: Listener[] = []

export function initState(initial: DemoState): void {
  state = initial
}

export function getState(): DemoState {
  return state
}

export function setState(patch: Partial<DemoState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

export function subscribe(listener: Listener): void {
  listeners.push(listener)
}
