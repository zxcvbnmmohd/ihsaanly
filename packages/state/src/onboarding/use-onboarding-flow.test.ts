import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RenderHookResult } from '@testing-library/react'
import { withDom } from '../../test/dom'
import { reactNative } from '../../test/native'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { items, setContentLanguage } = await import('@ihsaanly/core/content')
const { idsForPreset } = await import('@ihsaanly/core/plan/presets')
const { getLocale } = await import('../i18n/store')
const { getPlace } = await import('../location/store')
const { getNotificationPreferences } = await import('../notifications/store')
const { getEnabledItems, setEnabledItems } = await import('../plan/enabled-store')
const { getOnboarding } = await import('./store')
const { ONBOARDING_STEPS, useOnboardingFlow } = await import('./use-onboarding-flow')

type Actions = Parameters<typeof useOnboardingFlow>[0]

const london = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'device',
} as const
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

function flow(
  over: Partial<Actions> = {},
): RenderHookResult<ReturnType<typeof useOnboardingFlow>, unknown> {
  const actions: Actions = {
    theme: 'system',
    onSelectTheme: () => {},
    requestDeviceLocation: async () => ({ status: 'ok', place: london }),
    ...over,
  }
  return renderHook(() => useOnboardingFlow(actions))
}

describe('the onboarding flow', () => {
  beforeEach(() => {
    resetStorage()
    Object.assign(reactNative, { isRTL: false, os: 'ios', allowed: [], forced: [], reloads: [] })
  })
  afterEach(() => setContentLanguage('en'))

  it('starts on the welcome step with an answer already chosen for everything', () => {
    const { result } = flow()

    expect(result.current).toMatchObject({
      step: 'welcome',
      stepIndex: 0,
      stepCount: ONBOARDING_STEPS.length,
      locating: false,
      problem: null,
      query: '',
      place: null,
      gender: 'unspecified',
      itemCount: items.length,
    })
    expect(result.current.startingCount).toBeGreaterThan(0)
    expect(result.current.essentialCount).toBeGreaterThan(0)
  })

  it('walks forward and back through the steps', () => {
    const { result } = flow()

    act(() => result.current.onNext())
    expect(result.current.step).toBe('how')
    act(() => result.current.onNext())
    expect(result.current.step).toBe('location')

    act(() => result.current.onBack())
    expect(result.current.step).toBe('how')
    act(() => result.current.onBack())
    act(() => result.current.onBack())
    expect(result.current.stepIndex).toBe(0)
  })

  it('skips the introduction straight to setup', () => {
    const { result } = flow()
    act(() => result.current.onSkipIntro())
    expect(result.current.step).toBe('location')
  })

  it('lets the host keep the step, as the web does in its URL', () => {
    const visited: number[] = []
    const { result, rerender } = (() => {
      let index = 2
      const hook = renderHook(() =>
        useOnboardingFlow({
          theme: 'system',
          onSelectTheme: () => {},
          requestDeviceLocation: async () => ({ status: 'declined' }),
          stepControl: {
            index,
            go: (to) => {
              visited.push(to)
              index = to
            },
          },
        }),
      )
      return hook
    })()

    expect(result.current.step).toBe('location')
    act(() => result.current.onNext())
    rerender()

    expect(visited).toEqual([3])
    expect(result.current.step).toBe('you')
  })

  it('treats an index past the end as the last step', () => {
    const { result } = renderHook(() =>
      useOnboardingFlow({
        theme: 'system',
        onSelectTheme: () => {},
        requestDeviceLocation: async () => ({ status: 'declined' }),
        stepControl: { index: 99, go: () => {} },
      }),
    )
    expect(result.current.step).toBe('start')
  })

  it('finishes on the last step: marks onboarding complete with a time, and tells the host', () => {
    const onComplete = mock(() => {})
    const { result } = flow({ onComplete })
    act(() => result.current.onSkipIntro())
    for (let i = 0; i < 3; i += 1) act(() => result.current.onNext())
    expect(result.current.step).toBe('start')
    expect(getOnboarding().completed).toBe(false)

    act(() => result.current.onNext())

    expect(getOnboarding().completed).toBe(true)
    expect(Number.isNaN(Date.parse(getOnboarding().completedAt ?? ''))).toBe(false)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('finishes without a host callback too', () => {
    const { result } = flow()
    act(() => result.current.onSkipIntro())
    for (let i = 0; i < 4; i += 1) act(() => result.current.onNext())
    expect(getOnboarding().completed).toBe(true)
  })

  it('"Not now" moves on without asking for anything', () => {
    const ensureReminderPermission = mock(async () => {})
    const { result } = flow({ ensureReminderPermission })
    act(() => result.current.onSkipIntro())
    act(() => result.current.onNext())
    act(() => result.current.onNext())
    expect(result.current.step).toBe('reminders')

    act(() => result.current.onNotNow())

    expect(result.current.step).toBe('start')
    expect(ensureReminderPermission).not.toHaveBeenCalled()
  })

  describe('the reminders step', () => {
    const toReminders = (result: { current: ReturnType<typeof useOnboardingFlow> }): void => {
      act(() => result.current.onSkipIntro())
      act(() => result.current.onNext())
      act(() => result.current.onNext())
    }

    it('asks the OS for permission before moving on, when reminders are on', async () => {
      let granted = false
      const ensureReminderPermission = mock(async () => {
        await flush()
        granted = true
      })
      const { result } = flow({ ensureReminderPermission })
      toReminders(result)

      await act(async () => {
        result.current.onNext()
        await flush()
        await flush()
      })

      expect(granted).toBe(true)
      expect(result.current.step).toBe('start')
    })

    it('moves on even if the prompt fails', async () => {
      const { result } = flow({
        ensureReminderPermission: () => Promise.reject(new Error('denied')),
      })
      toReminders(result)

      await act(async () => {
        result.current.onNext()
        await flush()
        await flush()
      })

      expect(result.current.step).toBe('start')
    })

    it('does not ask when every reminder is off, and just advances', () => {
      const ensureReminderPermission = mock(async () => {})
      const { result } = flow({ ensureReminderPermission })
      act(() =>
        result.current.onToggleNotification({ windows: false, lookAhead: false, prayers: false }),
      )
      toReminders(result)

      act(() => result.current.onNext())

      expect(ensureReminderPermission).not.toHaveBeenCalled()
      expect(result.current.step).toBe('start')
    })

    it('just advances where there is no permission to ask for (the web)', () => {
      const { result } = flow()
      toReminders(result)
      act(() => result.current.onNext())
      expect(result.current.step).toBe('start')
    })
  })

  describe('choosing a place', () => {
    it('searches cities as the person types, and choosing one stores it and clears the search', () => {
      const { result } = flow()

      act(() => result.current.onQueryChange('lond'))
      expect(result.current.query).toBe('lond')
      expect(result.current.results.length).toBeGreaterThan(0)

      const chosen = result.current.results[0]
      if (!chosen) throw new Error('expected a city')
      act(() => result.current.onSelectPlace(chosen))

      expect(getPlace()).toEqual(chosen)
      expect(result.current.place).toEqual(chosen)
      expect(result.current.query).toBe('')
    })

    it('uses the device location, showing that it is looking meanwhile', async () => {
      let release: () => void = () => {}
      const { result } = flow({
        requestDeviceLocation: () =>
          new Promise((resolve) => {
            release = () => resolve({ status: 'ok', place: london })
          }),
      })

      act(() => result.current.onUseDevice())
      expect(result.current.locating).toBe(true)

      await act(async () => {
        release()
        await flush()
      })

      expect(result.current.locating).toBe(false)
      expect(result.current.problem).toBeNull()
      expect(getPlace()).toEqual(london)
    })

    it.each(['declined', 'unavailable'] as const)(
      'explains a location that is %s',
      async (status) => {
        const { result } = flow({ requestDeviceLocation: async () => ({ status }) })

        await act(async () => {
          result.current.onUseDevice()
          await flush()
        })

        expect(result.current).toMatchObject({ locating: false, problem: status, place: null })
      },
    )

    it('does not stay on "finding you" when the platform throws', async () => {
      const { result } = flow({ requestDeviceLocation: () => Promise.reject(new Error('boom')) })

      await act(async () => {
        result.current.onUseDevice()
        await flush()
      })

      expect(result.current).toMatchObject({ locating: false, problem: 'unavailable' })
    })
  })

  describe('answers', () => {
    it('stores the gender chosen, keeping the rest of onboarding', () => {
      const { result } = flow()

      act(() => result.current.onSelectGender('female'))

      expect(getOnboarding()).toMatchObject({ gender: 'female', completed: false })
      expect(result.current.gender).toBe('female')
    })

    it('changes only the reminder switches that were touched', () => {
      const { result } = flow()
      const before = getNotificationPreferences()

      act(() => result.current.onToggleNotification({ prayers: !before.prayers }))

      expect(getNotificationPreferences()).toEqual({ ...before, prayers: !before.prayers })
      expect(result.current.notifications.prayers).toBe(!before.prayers)
    })

    it('enables the items of a starter preset, and names them', () => {
      const { result } = flow()

      act(() => result.current.onSelectPreset('essentials'))

      expect(getEnabledItems()).toEqual(idsForPreset('essentials', items))
      expect(result.current.preset).toBe('essentials')
      expect(result.current.enabledTitles).toHaveLength(idsForPreset('essentials', items).length)
    })

    it('has no preset once the items were edited by hand', () => {
      const { result } = flow()
      act(() => result.current.onSelectPreset('essentials'))

      act(() => setEnabledItems(idsForPreset('essentials', items).slice(1)))

      expect(result.current.preset).toBeNull()
    })

    it("hands the host's theme choice straight through", () => {
      const onSelectTheme = mock(() => {})
      const { result } = flow({ theme: 'dark', onSelectTheme })

      act(() => result.current.onSelectTheme('light'))

      expect(result.current.theme).toBe('dark')
      expect(onSelectTheme).toHaveBeenCalledWith('light')
    })

    it('switches the language, and the screen shows it', () => {
      const { result } = flow()

      act(() => void result.current.onSelectLanguage('fr'))

      expect(getLocale()).toBe('fr')
      expect(result.current.language).toBe('fr')
    })
  })
})
