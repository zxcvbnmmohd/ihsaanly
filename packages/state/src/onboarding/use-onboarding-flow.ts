// The container logic behind the six-step onboarding flow: store reads and
// writes, step state, and building the props OnboardingScreen renders. Shared
// by mobile and the web companion, which differ only in two things neither
// screen nor store can supply — asking the device for a location fix, and (on
// mobile only) asking the OS for a reminders permission — so both come in as
// parameters instead of being read here.
import { items, resolveText } from '@ihsaanly/core/content'
import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { searchCities } from '@ihsaanly/core/location/cities'
import type { Place } from '@ihsaanly/core/location/place'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { idsForPreset, presetFor } from '@ihsaanly/core/plan/presets'
import type {
  LocationProblem,
  OnboardingScreenProps,
  OnboardingStep,
  StarterPreset,
} from '@ihsaanly/ui/screens/onboarding'
import type { ThemePreference } from '@ihsaanly/ui/types'
import { useState } from 'react'
import { chooseLanguage, useLocale } from '../i18n/store'
import { setPlace, usePlace } from '../location/store'
import { setNotificationPreferences, useNotificationPreferences } from '../notifications/store'
import { setEnabledItems, useEnabledItems } from '../plan/enabled-store'
import { type Gender, setOnboarding, useOnboarding } from './store'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'how',
  'location',
  'you',
  'reminders',
  'start',
]
const STEPS = ONBOARDING_STEPS
const SETUP_INDEX = STEPS.indexOf('location')

export type DeviceLocation =
  | { status: 'ok'; place: Place }
  | { status: 'declined' }
  | { status: 'unavailable' }

export interface OnboardingFlowActions {
  /** The host's current theme preference; its own store, not this package's business. */
  theme: ThemePreference
  onSelectTheme: (preference: ThemePreference) => void
  /** `expo-location` on mobile, `navigator.geolocation` on the web. */
  requestDeviceLocation: () => Promise<DeviceLocation>
  /**
   * Asks the OS for permission to deliver reminders, if the platform has one
   * to ask — a browser (`capabilities.reminders` off) does not, so the web
   * companion omits this and the flow advances straight past the prompt.
   */
  ensureReminderPermission?: () => Promise<void>
  /**
   * Where the current step lives when the host keeps it outside React state
   * (the web keeps it in the URL, so Back, Forward and reload work). Omitted,
   * the step is this hook's own state, as on mobile.
   */
  stepControl?: { index: number; go: (index: number) => void }
  /** Called once onboarding is marked complete, e.g. to leave the flow's URL. */
  onComplete?: () => void
}

interface Thing {
  index: number
  query: string
  problem: LocationProblem
  locating: boolean
}

/**
 * Two screens that say what the app is, then four that set it up. Every
 * question has an answer already chosen, so someone new can accept their way
 * through and arrive at a reasonable day without understanding the choices yet.
 */
export function useOnboardingFlow(actions: OnboardingFlowActions): OnboardingScreenProps {
  const [thing, setThing] = useState<Thing>({ index: 0, query: '', problem: null, locating: false })
  const place = usePlace()
  const onboarding = useOnboarding()
  const notifications = useNotificationPreferences()
  const enabled = useEnabledItems()
  const locale = useLocale()

  const index = actions.stepControl?.index ?? thing.index
  const step = STEPS[index] ?? 'start'
  const anyReminder = notifications.windows || notifications.lookAhead || notifications.prayers

  const go = (to: number): void => {
    if (actions.stepControl) actions.stepControl.go(to)
    else setThing((current) => ({ ...current, index: to }))
  }

  const advance = (): void => {
    if (index >= STEPS.length - 1) {
      setOnboarding({ ...onboarding, completed: true, completedAt: new Date().toISOString() })
      actions.onComplete?.()
      return
    }
    go(index + 1)
  }

  const next = (): void => {
    // The permission prompt belongs to the button that asks for it, not to
    // the Today tab some time later. Where there is nothing to ask (the web),
    // this just advances.
    if (step === 'reminders' && anyReminder && actions.ensureReminderPermission) {
      void actions.ensureReminderPermission().finally(advance)
      return
    }
    advance()
  }

  const choosePlace = (chosen: Place): void => {
    setPlace(chosen)
    setThing((current) => ({ ...current, query: '', problem: null }))
  }

  const useDevice = (): void => {
    setThing((current) => ({ ...current, locating: true, problem: null }))
    actions
      .requestDeviceLocation()
      .then((located) => {
        if (located.status === 'ok') {
          choosePlace(located.place)
          setThing((current) => ({ ...current, locating: false }))
          return
        }
        setThing((current) => ({ ...current, locating: false, problem: located.status }))
      })
      .catch(() => {
        // Whatever the platform threw, the card must not stay on "Finding you".
        setThing((current) => ({ ...current, locating: false, problem: 'unavailable' }))
      })
  }

  return {
    step,
    stepIndex: index,
    stepCount: STEPS.length,
    language: supportedLanguageOf(locale),
    theme: actions.theme,
    place,
    locating: thing.locating,
    problem: thing.problem,
    query: thing.query,
    results: searchCities(thing.query),
    gender: onboarding.gender,
    notifications,
    preset: presetFor(enabled, items),
    enabledTitles: items
      .filter((item) => enabled.includes(item.id))
      .map((item) => resolveText(item.title) ?? item.id),
    itemCount: items.length,
    essentialCount: idsForPreset('essentials', items).length,
    startingCount: idsForPreset('starting', items).length,
    onSelectLanguage: chooseLanguage,
    onSelectTheme: actions.onSelectTheme,
    onQueryChange: (query: string) => setThing((current) => ({ ...current, query })),
    onUseDevice: useDevice,
    onSelectPlace: choosePlace,
    onSelectGender: (gender: Gender) => setOnboarding({ ...onboarding, gender }),
    onToggleNotification: (change: Partial<NotificationPreferences>) =>
      setNotificationPreferences({ ...notifications, ...change }),
    onSelectPreset: (preset: StarterPreset) => setEnabledItems(idsForPreset(preset, items)),
    onNext: next,
    onBack: () => go(Math.max(0, index - 1)),
    onSkipIntro: () => go(SETUP_INDEX),
    onNotNow: advance,
  }
}
