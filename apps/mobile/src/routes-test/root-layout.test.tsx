import '../../test/more'
import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AppState, Platform } from 'react-native'
import { type Metrics, SafeAreaProvider } from 'react-native-safe-area-context'
import { last, mockScreen } from '../../test/more'
import { nativeTabs } from '../../test/router'

interface OnboardingProps {
  onRestore: (() => void) | undefined
}
interface AccountProps {
  restore?: { onBackToSetup: () => void; onContinueSetup: () => void }
}
const onboarding = mockScreen<OnboardingProps>(
  '@ihsaanly/ui/screens/onboarding',
  'OnboardingScreen',
)
const accounts = mockScreen<AccountProps>('@ihsaanly/ui/screens/account', 'AccountScreen')

// Expo Go has no reminders API, so the notification-response hook stays idle.
mock.module('expo-constants', () => ({
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}))

// Records the props and labels the shared fake drops, and puts the fake back after.
const tabs = {
  props: [] as Record<string, unknown>[],
  labels: [] as string[],
  names: [] as string[],
}
mock.module('expo-router/native-tabs', () => ({
  NativeTabs: Object.assign(
    (props: Record<string, unknown> & { children?: ReactNode }) => {
      tabs.props.push(props)
      return <>{props.children}</>
    },
    {
      Trigger: Object.assign(
        ({ name, children }: { name: string; children?: ReactNode }) => {
          tabs.names.push(name)
          return <>{children}</>
        },
        {
          Icon: () => null,
          Label: ({ children }: { children?: ReactNode }) => {
            tabs.labels.push(String(children))
            return null
          },
        },
      ),
    },
  ),
}))

// The real module needs a Firebase config the test build does not have.
const realCloud = { ...(await import('@/cloud')) }
const cloud = { starts: 0, stops: 0 }
const setCloud = (enabled: boolean): void => {
  mock.module('@/cloud', () => ({
    ...realCloud,
    cloudEnabled: enabled,
    startMobileCloud: () => {
      cloud.starts += 1
      return () => {
        cloud.stops += 1
      }
    },
  }))
}
setCloud(false)

// RNW's AppState is driven by page visibility; this records the subscription instead.
const appState = {
  handlers: [] as ((state: string) => void)[],
  removed: 0,
}
const realAddEventListener = AppState.addEventListener
AppState.addEventListener = ((_type: string, handler: (state: string) => void) => {
  appState.handlers.push(handler)
  return {
    remove: () => {
      appState.removed += 1
    },
  }
}) as typeof AppState.addEventListener

const { default: RootLayout, ErrorBoundary, unstable_settings } = await import('../app/_layout')
const { setOnboarding } = await import('@ihsaanly/state/onboarding/store')
const { setThemePreference } = await import('@/theme/store')
const { getStrings } = await import('@ihsaanly/state/strings')

const realOS = Platform.OS
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: {
    top: 0,
    bottom: 0,
    ...Object.fromEntries(['left', 'right'].map((side) => [side, 0])),
  },
}
// The restore sign-in reads the safe area, which the app's native root provides.
const app = (): ReactElement => (
  <SafeAreaProvider initialMetrics={metrics as Metrics}>
    <RootLayout />
  </SafeAreaProvider>
)

afterAll(() => {
  mock.module('@/cloud', () => realCloud)
  mock.module('expo-router/native-tabs', () => nativeTabs)
  AppState.addEventListener = realAddEventListener
})

describe('root layout', () => {
  beforeEach(() => {
    onboarding.length = 0
    accounts.length = 0
    tabs.props.length = 0
    tabs.labels.length = 0
    tabs.names.length = 0
    cloud.starts = 0
    cloud.stops = 0
    appState.handlers.length = 0
    appState.removed = 0
    setCloud(false)
    setThemePreference('light')
    act(() => setOnboarding({ completed: false, gender: 'unspecified' }))
  })

  afterEach(() => {
    ;(Platform as { OS: string }).OS = realOS
    cleanup()
    setOnboarding({ completed: false, gender: 'unspecified' })
  })

  it('opens on Today', () => {
    expect(unstable_settings).toEqual({ anchor: '(home)' })
  })

  describe('before onboarding is done', () => {
    it('shows onboarding instead of the tabs, with no restore without a cloud', () => {
      render(app())
      expect(onboarding).not.toHaveLength(0)
      expect(last(onboarding).onRestore).toBeUndefined()
      expect(tabs.props).toEqual([])
    })

    it('offers restore with a cloud, and swaps in the sign-in until it ends', () => {
      setCloud(true)
      render(app())
      const restore = last(onboarding).onRestore
      expect(restore).toBeDefined()
      expect(accounts).toEqual([])

      act(() => restore?.())
      expect(last(accounts).restore).toBeDefined()

      onboarding.length = 0
      act(() => last(accounts).restore?.onBackToSetup())
      expect(last(onboarding)).toBeDefined()
    })

    it('keeps the gate shut after a restore of an unfinished setup, then continues', () => {
      setCloud(true)
      render(app())
      act(() => last(onboarding).onRestore?.())
      onboarding.length = 0
      act(() => last(accounts).restore?.onContinueSetup())
      expect(last(onboarding)).toBeDefined()
    })
  })

  describe('once onboarding is done', () => {
    beforeEach(() => act(() => setOnboarding({ completed: true, gender: 'unspecified' })))

    it('shows the three tabs, labelled in the current language', () => {
      const strings = getStrings()
      render(app())
      expect(onboarding).toEqual([])
      expect(tabs.names).toEqual(['(home)', '(library)', '(more)'])
      expect(tabs.labels).toEqual([strings.tabs.today, strings.tabs.library, strings.tabs.more])
    })

    it('tints the bar with the palette and leaves the background to iOS', () => {
      ;(Platform as { OS: string }).OS = 'ios'
      render(app())
      const props = last(tabs.props)
      expect(props.tintColor).toBeTruthy()
      expect(props.backgroundColor).toBeUndefined()
      expect(props.indicatorColor).toBe(props.rippleColor)
    })

    it('paints the Android bar with the top of the wash', () => {
      ;(Platform as { OS: string }).OS = 'android'
      render(app())
      expect(last(tabs.props).backgroundColor).toBeTruthy()
    })
  })

  describe('cloud sync', () => {
    it('does not start without a cloud', () => {
      const view = render(app())
      view.unmount()
      expect(cloud.starts).toBe(0)
      expect(appState.handlers).toEqual([])
    })

    it('starts once, syncs on foreground only, and stops on unmount', () => {
      setCloud(true)
      const view = render(app())
      expect(cloud.starts).toBe(1)
      expect(appState.handlers).toHaveLength(1)

      appState.handlers[0]?.('background')
      appState.handlers[0]?.('active')

      view.unmount()
      expect(appState.removed).toBe(1)
      expect(cloud.stops).toBe(1)
    })
  })
})

describe('ErrorBoundary', () => {
  it('shows the error and retries on press', async () => {
    const { screen } = await import('@testing-library/react')
    const strings = getStrings()
    let retries = 0
    render(
      <ErrorBoundary
        error={new Error('boom')}
        retry={async () => {
          retries += 1
        }}
      />,
    )
    expect(screen.getByText(strings.error.title)).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    screen.getByText(strings.error.retry).click()
    expect(retries).toBe(1)
  })
})
