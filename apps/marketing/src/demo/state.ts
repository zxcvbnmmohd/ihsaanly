// The demo's only mutable state, as a single reducer so it can be driven by
// `useReducer` in the phone component and unit-tested here without React.
// It stands in for the app's stores: prayer marks, completions, the items on
// Today, per-item reminders, and where the visitor is in the screens and the
// coach.

import type { Place } from '@ihsaanly/core/location/place'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { LibraryFilter } from '@ihsaanly/ui/screens/library'
import { defaultCityFor } from './cities'
import type { CoachStep } from './coach'
import { type Completions, DEFAULT_ENABLED, type PrayerMarks, toggleMark } from './engine'

export type DemoTab = 'today' | 'library' | 'more'
type DemoView = DemoTab | 'item'

export interface DemoState {
  /** Read once from the visitor's time zone. */
  place: Place
  marks: PrayerMarks
  completed: Completions
  /** The items on Today, starting from the app's defaults. */
  enabled: string[]
  remind: Partial<Record<string, boolean>>
  view: DemoView
  /** Where "back" from an item returns to. */
  previousTab: 'today' | 'library'
  selectedItemId: string | null
  /** The open item's repeat counter. */
  count: number
  libraryQuery: string
  libraryFilter: LibraryFilter
  coachStep: CoachStep
}

export type DemoAction =
  | { type: 'select-tab'; tab: DemoTab }
  | { type: 'open-item'; id: string }
  | { type: 'back' }
  | { type: 'mark-prayer'; prayer: Prayer; at: Date; wasCoachTarget: boolean }
  | { type: 'library-query'; query: string }
  | { type: 'library-filter'; filter: LibraryFilter }
  | { type: 'toggle-done'; id: string; at: Date }
  | { type: 'tap-counter'; id: string; target: number; at: Date }
  | { type: 'reset-counter' }
  | { type: 'toggle-on-today'; id: string }
  | { type: 'toggle-remind'; id: string; value: boolean }

/** The visitor's own city, guessed from their time zone — same default the app itself falls back to. */
export function initialDemoState(timeZone: string): DemoState {
  return {
    place: defaultCityFor(timeZone),
    marks: {},
    completed: {},
    enabled: DEFAULT_ENABLED,
    remind: {},
    view: 'today',
    previousTab: 'today',
    selectedItemId: null,
    count: 0,
    libraryQuery: '',
    libraryFilter: 'all',
    coachStep: 'mark',
  }
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'select-tab': {
      const previousTab = action.tab === 'more' ? state.previousTab : action.tab
      return { ...state, view: action.tab, previousTab, coachStep: 'done' }
    }

    case 'open-item': {
      const previousTab =
        state.view === 'today' || state.view === 'library' ? state.view : state.previousTab
      return {
        ...state,
        view: 'item',
        selectedItemId: action.id,
        previousTab,
        count: 0,
        coachStep: 'done',
      }
    }

    case 'back':
      return { ...state, view: state.previousTab, selectedItemId: null }

    case 'mark-prayer': {
      const marks = toggleMark(state.marks, action.prayer, action.at)
      const coachStep: CoachStep =
        state.coachStep === 'done' ? 'done' : action.wasCoachTarget ? 'open' : 'done'
      return { ...state, marks, coachStep }
    }

    case 'library-query':
      return { ...state, libraryQuery: action.query }

    case 'library-filter':
      return { ...state, libraryFilter: action.filter }

    case 'toggle-done':
      return {
        ...state,
        completed: toggleMark(state.completed, action.id, action.at),
        count: 0,
      }

    case 'tap-counter': {
      // Reaching the target completes the item, as the app's counter does.
      if (state.count + 1 < action.target) return { ...state, count: state.count + 1 }
      return {
        ...state,
        count: action.target,
        completed: { ...state.completed, [action.id]: action.at },
      }
    }

    case 'reset-counter':
      return { ...state, count: 0 }

    case 'toggle-on-today': {
      const enabled = state.enabled.includes(action.id)
        ? state.enabled.filter((id) => id !== action.id)
        : [...state.enabled, action.id]
      return { ...state, enabled }
    }

    case 'toggle-remind':
      return { ...state, remind: { ...state.remind, [action.id]: action.value } }

    default:
      return state
  }
}
