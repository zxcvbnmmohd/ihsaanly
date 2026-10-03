// The demo's only mutable state, as a single reducer so it can be driven by
// `useReducer` in the phone component and unit-tested here without React.
// It stands in for the app's stores: prayer marks, completions, the items on
// Today, per-item reminders, and where the visitor is in the screens and the
// coach.

import type { Place } from '@ihsaanly/core/location/place'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { markKind } from '@ihsaanly/ui/props/today'
import type { LibraryFilter } from '@ihsaanly/ui/screens/library'
import { defaultCityFor } from './cities'
import type { CoachStep } from './coach'
import { demoItemById } from './demo-content'
import {
  type Completions,
  DEFAULT_ENABLED,
  type PrayerMarks,
  type Progress,
  toggleMark,
} from './engine'

export type DemoTab = 'today' | 'library' | 'more'
type DemoView = DemoTab | 'item'

export interface DemoState {
  /** Read once from the visitor's time zone. */
  place: Place
  marks: PrayerMarks
  completed: Completions
  /** How far counted and in-parts items have got on Today. */
  progress: Progress
  /** The counter or parts sheet that is open on Today. */
  panelItemId: string | null
  /** The last item marked done from Today, for the undo bar; `seq` restarts its timer. */
  undo: { itemId: string; seq: number } | null
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
  | { type: 'circle'; id: string; done: boolean; at: Date }
  | { type: 'close-panel' }
  | { type: 'panel-count'; id: string; at: Date }
  | { type: 'panel-complete'; id: string; at: Date }
  | { type: 'panel-toggle-part'; id: string; partId: string; at: Date }
  | { type: 'undo' }
  | { type: 'dismiss-undo' }
  | { type: 'toggle-on-today'; id: string }
  | { type: 'toggle-remind'; id: string; value: boolean }

/** The visitor's own city, guessed from their time zone — same default the app itself falls back to. */
export function initialDemoState(timeZone: string): DemoState {
  return {
    place: defaultCityFor(timeZone),
    marks: {},
    completed: {},
    progress: {},
    panelItemId: null,
    undo: null,
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

/** Marks `id` done from Today: it leaves its section, the sheet closes and the undo bar shows. */
function finish(state: DemoState, id: string, at: Date): DemoState {
  return {
    ...state,
    completed: { ...state.completed, [id]: at },
    panelItemId: null,
    undo: { itemId: id, seq: (state.undo?.seq ?? 0) + 1 },
  }
}

function unmark(state: DemoState, id: string): DemoState {
  const completed = { ...state.completed }
  delete completed[id]
  const progress = { ...state.progress }
  delete progress[id]
  return { ...state, completed, progress, undo: state.undo?.itemId === id ? null : state.undo }
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

    case 'circle': {
      const item = demoItemById(action.id)
      if (!item) return state
      if (action.done) return unmark(state, action.id)
      const next = { ...state, coachStep: 'done' as const }
      return markKind(item) === 'once'
        ? finish(next, action.id, action.at)
        : { ...next, panelItemId: action.id }
    }

    case 'close-panel':
      return { ...state, panelItemId: null }

    case 'panel-count': {
      const item = demoItemById(action.id)
      const count = (state.progress[action.id]?.count ?? 0) + 1
      const progress = { ...state.progress, [action.id]: { count, parts: [] } }
      const counted = { ...state, progress }
      return count >= (item?.repeat ?? 1) ? finish(counted, action.id, action.at) : counted
    }

    case 'panel-complete': {
      const item = demoItemById(action.id)
      const parts = (item?.parts ?? []).map((part) => part.id)
      const progress = {
        ...state.progress,
        [action.id]: { count: item?.repeat ?? 1, parts },
      }
      return finish({ ...state, progress }, action.id, action.at)
    }

    case 'panel-toggle-part': {
      const item = demoItemById(action.id)
      const said = state.progress[action.id]?.parts ?? []
      const parts = said.includes(action.partId)
        ? said.filter((id) => id !== action.partId)
        : [...said, action.partId]
      const progress = { ...state.progress, [action.id]: { count: 0, parts } }
      const all = (item?.parts ?? []).every((part) => parts.includes(part.id))
      return all ? finish({ ...state, progress }, action.id, action.at) : { ...state, progress }
    }

    case 'undo':
      return state.undo ? unmark(state, state.undo.itemId) : state

    case 'dismiss-undo':
      return { ...state, undo: null }

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
