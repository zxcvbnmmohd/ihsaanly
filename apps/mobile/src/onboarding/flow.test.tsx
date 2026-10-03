import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import * as restore from '@ihsaanly/state/cloud/restore'
import { act, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { BackHandler } from 'react-native'
import { installProviderButtons, installSafeArea, screens } from '../../test/accounts'
import { settle } from '../../test/act'
import { installLocation, location, resetLocation } from '../../test/location'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'
import { appearance, installAppearance, restoreAppearance } from '../../test/theme'

installSafeArea()

const onboardingScreens: Record<string, unknown>[] = []
function installOnboardingScreen(): void {
  mock.module('@ihsaanly/ui/screens/onboarding', () => ({
    OnboardingScreen: (props: Record<string, unknown>) => {
      onboardingScreens.push(props)
      return null
    },
  }))
}

installOnboardingScreen()
installProviderButtons()
installReminderFakes()
installLocation()
const { OnboardingFlow } = await import('./flow')
const { getThemePreference, setThemePreference } = await import('@/theme/store')
const { setNotificationPreferences } = await import('@ihsaanly/state/notifications/store')
const { DEFAULT_NOTIFICATION_PREFERENCES } = await import(
  '@ihsaanly/core/plan/notification-preferences'
)
const { getPlace, setPlace } = await import('@ihsaanly/state/location/store')

interface Screen {
  step: string
  theme: string
  problem: string | null
  locating: boolean
  onNext: () => void
  onSelectTheme: (theme: string) => void
  onUseDevice: () => void
  onRestore: (() => void) | undefined
}
const screen = (): Screen => onboardingScreens.at(-1) as unknown as Screen
interface RestoreScreen {
  restore: { onBackToSetup: () => void; onContinueSetup: () => void }
}
const restoreScreen = (): RestoreScreen['restore'] =>
  (screens.account.at(-1) as unknown as RestoreScreen).restore

let outcome = 'idle'
const spies: { mockRestore: () => void }[] = []

function mount(props: { restoring?: boolean; onRestore?: (() => void) | undefined } = {}): {
  ended: string[]
  view: ReturnType<typeof render>
  show: (restoring: boolean) => void
} {
  const ended: string[] = []
  const element = (restoring: boolean): ReactElement => (
    <OnboardingFlow
      restoring={restoring}
      onRestore={props.onRestore}
      onRestoreEnd={() => {
        ended.push('end')
      }}
    />
  )
  const view = render(element(props.restoring ?? false))
  return { ended, view, show: (restoring: boolean) => view.rerender(element(restoring)) }
}

beforeEach(() => {
  installOnboardingScreen()
  installProviderButtons()
  installReminderFakes()
  installLocation()
  installAppearance()
  resetReminderFakes()
  resetLocation()
  onboardingScreens.length = 0
  screens.account = []
  outcome = 'idle'
  setThemePreference('system')
  appearance.set = []
  setPlace(null as never)
  setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, windows: true })
  spies.push(spyOn(restore, 'useRestoreOutcome').mockImplementation((() => outcome) as never))
  spies.push(
    spyOn(BackHandler, 'addEventListener').mockImplementation((() => ({
      remove: () => {},
    })) as never),
  )
})
afterEach(() => {
  for (const created of spies.splice(0)) created.mockRestore()
  restoreAppearance()
})

describe('OnboardingFlow steps', () => {
  it('starts at the welcome step and offers restore only when the build has a cloud', () => {
    mount()
    expect(screen().step).toBe('welcome')
    expect(screen().onRestore).toBeUndefined()

    const onRestore = (): void => {}
    mount({ onRestore })
    expect(screen().onRestore).toBe(onRestore)
  })

  it('applies a chosen theme through the theme store', () => {
    mount()
    expect(screen().theme).toBe('system')
    act(() => screen().onSelectTheme('dark'))
    expect(getThemePreference()).toBe('dark')
    expect(appearance.set).toContain('dark')
    expect(screen().theme).toBe('dark')
  })

  it('moves through the steps', () => {
    mount()
    act(() => screen().onNext())
    expect(screen().step).toBe('how')
  })
})

describe('device location', () => {
  it('sets the place from a fix', async () => {
    mount()
    act(() => screen().onUseDevice())
    await settle()
    expect(getPlace()).toMatchObject({ label: 'London, England, UK', source: 'device' })
    expect(screen().locating).toBe(false)
    expect(screen().problem).toBeNull()
  })

  it('says so when permission is declined', async () => {
    location.foreground = { granted: false }
    mount()
    act(() => screen().onUseDevice())
    await settle()
    expect(screen().problem).toBe('declined')
    expect(getPlace()).toBeNull()
  })

  it('says so when no fix can be had', async () => {
    location.current = async () => {
      throw new Error('services off')
    }
    mount()
    act(() => screen().onUseDevice())
    await settle()
    expect(screen().problem).toBe('unavailable')
  })
})

describe('the reminders step', () => {
  function toReminders(): ReturnType<typeof mount> {
    const mounted = mount()
    for (let i = 0; i < 4; i++) act(() => screen().onNext())
    expect(screen().step).toBe('reminders')
    return mounted
  }

  it('asks the OS from the button that continues, and then moves on', async () => {
    toReminders()
    act(() => screen().onNext())
    await settle()
    expect(fake.categories.length).toBeGreaterThan(0)
    expect(screen().step).toBe('start')
  })

  it('moves on even when no permission can be had', async () => {
    fake.executionEnvironment = 'storeClient'
    toReminders()
    act(() => screen().onNext())
    await settle()
    expect(screen().step).toBe('start')
  })
})

describe('restoring an account', () => {
  it('shows sign-in in place of the steps and keeps the step it was on', () => {
    const { show } = mount()
    act(() => screen().onNext())
    onboardingScreens.length = 0
    show(true)
    expect(onboardingScreens).toEqual([])
    expect(screens.account.length).toBeGreaterThan(0)

    show(false)
    expect(screen().step).toBe('how')
  })

  it('goes back to the steps from the sign-in', () => {
    const { ended } = mount({ restoring: true })
    act(() => restoreScreen().onBackToSetup())
    expect(ended).toEqual(['end'])
  })

  it('continues setup: leaves the sign-in and advances a step', () => {
    const { ended, show } = mount({ restoring: true })
    act(() => restoreScreen().onContinueSetup())
    expect(ended).toEqual(['end'])
    show(false)
    expect(screen().step).toBe('how')
  })

  it('leaves the sign-in when the account is restored', async () => {
    setNotificationPreferences({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      windows: false,
      lookAhead: false,
      prayers: false,
    })
    outcome = 'restored'
    const { ended } = mount({ restoring: true })
    await settle()
    expect(ended).toEqual(['end'])
  })
})
