import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { completeItem } from '@ihsaanly/state/plan/completions'
import { wipe } from '@ihsaanly/state/storage/backend'
import { allActions, reloadEvents } from '@ihsaanly/state/storage/events'
import { reloadPreferences } from '@ihsaanly/state/storage/preference-store'
import { act, renderHook } from '@testing-library/react'
import { AppState } from 'react-native'

import { getRemoteMarks, noteRemoteMarks, type RemoteMark } from './ledger'
import { useRemoteMarkToast } from './use-remote-mark-toast'

const at = new Date('2026-09-23T12:30:00Z').getTime()
const mark: RemoteMark = {
  source: 'widget',
  kind: 'done',
  id: 'dhikr-morning',
  at,
  timeZone: 'Europe/London',
}

let listeners: ((state: string) => void)[] = []
let removed = 0
let appState: ReturnType<typeof spyOn>

beforeEach(() => {
  wipe()
  reloadPreferences()
  reloadEvents()
  listeners = []
  removed = 0
  appState = spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (state: string) => void,
  ) => {
    listeners.push(listener)
    return { remove: () => (removed += 1) }
  }) as never)
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true })
})
afterEach(() => appState.mockRestore())

describe('useRemoteMarkToast', () => {
  it('shows nothing while there is nothing to say', () => {
    const { result, unmount } = renderHook(() => useRemoteMarkToast())
    expect(result.current.toast).toBeNull()
    unmount()
    expect(removed).toBe(1)
  })

  it('says what was marked while the app is in front, and hides it while it is not', () => {
    noteRemoteMarks([mark])
    const { result } = renderHook(() => useRemoteMarkToast())
    expect(result.current.toast?.text).toBe('Marked done from your widget')
    expect(result.current.toast?.action?.label).toBe('Undo')

    act(() => listeners.forEach((listener) => listener('background')))
    expect(result.current.toast).toBeNull()
    act(() => listeners.forEach((listener) => listener('active')))
    expect(result.current.toast).not.toBeNull()

    // A new mark is a new toast.
    const first = result.current.toast?.id
    act(() => noteRemoteMarks([{ ...mark, at: at + 1 }]))
    expect(result.current.toast?.id).not.toBe(first)
    expect(result.current.toast?.text).toBe('2 marked from your widgets')
  })

  it('undoes exactly those marks', () => {
    completeItem(mark.id, new Date(at), mark.timeZone)
    noteRemoteMarks([mark])
    const { result } = renderHook(() => useRemoteMarkToast())
    act(() => result.current.toast?.action?.onPress())
    expect(allActions().map((action) => action.kind)).toContain('item-uncompleted')
    expect(getRemoteMarks()).toEqual([])
    expect(result.current.toast).toBeNull()
  })

  it('forgets them when it times out', () => {
    noteRemoteMarks([mark])
    const { result } = renderHook(() => useRemoteMarkToast())
    act(() => result.current.onDismiss())
    expect(getRemoteMarks()).toEqual([])
    expect(result.current.toast).toBeNull()
  })
})
