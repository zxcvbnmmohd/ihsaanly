import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('../storage/backend')
const { noHomeTransition, setHomeTransitionSource } = await import('../events/home-transition')
const { setEventSettings, DEFAULT_EVENT_SETTINGS } = await import('../events/store')
const { setPlace } = await import('../location/store')
const { setOnboarding } = await import('../onboarding/store')
const { setEnabledItems } = await import('./enabled-store')
const { setKnownItems } = await import('../memorise/store')
const { setUserState } = await import('./user-state-store')
const { DEFAULT_USER_STATE } = await import('@ihsaanly/core/plan/user-state')
const { usePlan, useSignals } = await import('./use-plan')

const london = {
  label: 'London',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const

afterAll(() => setHomeTransitionSource(noHomeTransition))

describe('useSignals', () => {
  beforeEach(() => {
    resetStorage()
    setHomeTransitionSource(noHomeTransition)
  })

  it('has nothing to plan without a place', () => {
    const { result } = renderHook(() => useSignals())
    expect(result.current).toBeNull()
    expect(backend.readPreferenceRow('qadaProcessedThrough')).toBeNull()
  })

  it('gathers the day around the place: a week ahead, prayer times either side', () => {
    setPlace(london)
    const { result } = renderHook(() => useSignals())

    const signals = result.current
    expect(signals?.timeZone).toBe('Europe/London')
    expect(signals?.upcoming).toHaveLength(7)
    expect(signals?.prayerTimes).toHaveLength(8)
    expect(signals?.activeEvents).toEqual([])
    expect(signals?.attendsJumuah).toBeDefined()
  })

  it('starts the rollover once there is a place, planting its cursor', () => {
    const { result } = renderHook(() => useSignals())
    expect(backend.readPreferenceRow('qadaProcessedThrough')).toBeNull()

    act(() => setPlace(london))

    expect(result.current).not.toBeNull()
    expect(backend.readPreferenceRow('qadaProcessedThrough')).not.toBeNull()
  })

  it("passes the person's choices through as preferences", () => {
    setPlace(london)
    setEnabledItems(['one'])
    setKnownItems(['two'])
    const { result } = renderHook(() => useSignals())

    expect(result.current?.preferences.enabledItemIds).toEqual(['one'])
    expect(result.current?.preferences.knownItemIds).toEqual(['two'])
  })

  it('raises manual events always, and the home transition only when detection is on', () => {
    setPlace(london)
    setHomeTransitionSource(() => 'entering-home')
    setEventSettings({ ...DEFAULT_EVENT_SETTINGS, manual: ['rain'] })
    const { result } = renderHook(() => useSignals())
    expect(result.current?.activeEvents).toEqual(['rain'])

    act(() => setEventSettings({ ...DEFAULT_EVENT_SETTINGS, manual: ['rain'], detectHome: true }))
    expect(result.current?.activeEvents).toEqual(['rain', 'entering-home'])

    setHomeTransitionSource(noHomeTransition)
    act(() => setEventSettings({ ...DEFAULT_EVENT_SETTINGS, detectHome: true }))
    expect(result.current?.activeEvents).toEqual([])
  })

  it("decides Jumu'ah from gender and travel before the planner sees either", () => {
    setPlace(london)
    setOnboarding({ completed: true, gender: 'female' })
    const { result } = renderHook(() => useSignals())
    const woman = result.current?.attendsJumuah

    act(() => setOnboarding({ completed: true, gender: 'male' }))
    const man = result.current?.attendsJumuah
    act(() => setUserState({ ...DEFAULT_USER_STATE, travelling: true }))
    const travelling = result.current?.attendsJumuah

    expect(woman).toBe(false)
    expect(man).toBe(true)
    expect(travelling).toBe(false)
  })
})

describe('usePlan', () => {
  beforeEach(resetStorage)

  it('has no plan without a place, and a plan for today once there is one', () => {
    const { result } = renderHook(() => usePlan())
    expect(result.current).toBeNull()

    act(() => setPlace(london))

    expect(result.current?.today).toBeDefined()
    expect(Array.isArray(result.current?.notifications)).toBe(true)
  })
})
