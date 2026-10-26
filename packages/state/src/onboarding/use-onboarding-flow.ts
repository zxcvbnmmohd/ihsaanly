// The container logic behind the onboarding flow: store reads and writes,
// step state, and building the props OnboardingScreen renders. Shared by
// mobile and the web companion, which differ only in what neither screen nor
// store can supply — asking the device for a location fix, (on mobile only)
// asking the OS for notification permission and turning on announcements, and
// whether there are widgets to offer — so those come in as parameters instead
// of being read here.
import { items } from '@ihsaanly/core/content'
import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { searchCities } from '@ihsaanly/core/location/cities'
import type { Place } from '@ihsaanly/core/location/place'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import { plan } from '@ihsaanly/core/plan/plan'
import { idsForPreset, presetFor } from '@ihsaanly/core/plan/presets'
import type {
  LocationProblem,
  OnboardingScreenProps,
  OnboardingStep,
  SetupRowId,
  StarterPreset,
  WidgetGuide,
} from '@ihsaanly/ui/screens/onboarding'
import type { AccentName, ThemePreference } from '@ihsaanly/ui/types'
import { useState } from 'react'
import { chooseLanguage, useLocale } from '../i18n/store'
import { setPlace, usePlace } from '../location/store'
import { setNotificationPreferences, useNotificationPreferences } from '../notifications/store'
import { setEnabledItems, useEnabledItems } from '../plan/enabled-store'
import { useSignals } from '../plan/use-plan'
import { useUserState } from '../plan/user-state-store'
import { useStrings } from '../strings'
import { setAccent, useAccent } from '../theme/accent-store'
import { PREVIEW_PLACE, reminderPreview, sourcedExample, widgetPreview } from './previews'
import { type Gender, setOnboarding, useOnboarding } from './store'

/**
 * Every step, in order, where the host has widgets (the mobile app). Three
 * that say what the app is, then setup, ending on a summary of it all.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'how',
  'sourced',
  'location',
  'you',
  'start',
  'reminders',
  'accent',
  'widgets',
  'summary',
]

/** The steps for a host: one without widgets (the web) leaves that step out. */
export function onboardingSteps(widgets: boolean): OnboardingStep[] {
  return widgets ? ONBOARDING_STEPS : ONBOARDING_STEPS.filter((step) => step !== 'widgets')
}

/**
 * Where each summary row leads once onboarding is done: its More screen, or
 * the widget gallery (More → Widgets), which may not exist in every build;
 * a host that has no such route simply lands on its not-found screen.
 */
export const SETTING_PATHS = {
  location: '/location',
  reminders: '/notifications',
  tracking: '/tracking',
  start: '/starting-point',
  accent: '/appearance',
  widgets: '/widgets',
  language: '/language',
} as const satisfies Record<SetupRowId, string>

export const ABOUT_PATH = '/about'

/** A place the finished flow can open in place of Today. */
export type OnboardingDestination = (typeof SETTING_PATHS)[SetupRowId] | typeof ABOUT_PATH

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
   * Asks the OS for permission to show notifications, if the platform has one
   * to ask, and resolves to whether it was granted — a browser
   * (`capabilities.reminders` off) does not, so the web companion omits this
   * and the flow advances straight past the prompt. Given, the reminders step
   * also previews the notifications it would allow.
   */
  ensureReminderPermission?: () => Promise<boolean>
  /**
   * Turns announcements on, the same path as the More → Reminders switch.
   * Given, the reminders step offers the choice (off until chosen) and this
   * runs once permission is granted. Omitted where there is no push (the web).
   */
  enableAnnouncements?: () => Promise<unknown>
  /**
   * The host can put Ihsaanly on the Home and Lock Screen (the mobile app):
   * its platform, for the guide's steps, and the widgets' entry now, for the
   * guide's live preview. Omitted, the widget step and the summary's widget
   * row are left out.
   */
  widgets?: Omit<WidgetGuide, 'open'>
  /**
   * Where the current step lives when the host keeps it outside React state
   * (the web keeps it in the URL, so Back, Forward and reload work). Omitted,
   * the step is this hook's own state, as on mobile.
   */
  stepControl?: { index: number; go: (index: number) => void }
  /**
   * Called once onboarding is marked complete, e.g. to leave the flow's URL.
   * `destination` is set when the person asked to go somewhere from the
   * summary (a setting, About, the widget gallery).
   */
  onComplete?: (destination?: OnboardingDestination) => void
}

interface Thing {
  index: number
  query: string
  problem: LocationProblem
  locating: boolean
  /** The reminders step's Announcements choice, applied only on a grant. */
  announcements: boolean
  /** "Show me how" on the widget step: its guide is open over the step. */
  widgetGuide: boolean
}

/**
 * Three screens that say what the app is, then setup. Every question has an
 * answer already chosen, so someone new can accept their way through and
 * arrive at a reasonable day without understanding the choices yet; the
 * summary then shows what was chosen and leads to where each lives.
 */
export function useOnboardingFlow(actions: OnboardingFlowActions): OnboardingScreenProps {
  const [thing, setThing] = useState<Thing>({
    index: 0,
    query: '',
    problem: null,
    locating: false,
    announcements: false,
    widgetGuide: false,
  })
  const place = usePlace()
  const onboarding = useOnboarding()
  const notifications = useNotificationPreferences()
  const enabled = useEnabledItems()
  const locale = useLocale()
  const accent = useAccent()
  const userState = useUserState()
  const strings = useStrings()
  const signals = useSignals(PREVIEW_PLACE)

  const steps = onboardingSteps(actions.widgets !== undefined)
  const index = actions.stepControl?.index ?? thing.index
  const step = steps[index] ?? 'summary'
  const anyReminder = notifications.windows || notifications.lookAhead || notifications.prayers

  // Planned with every reminder on, so the preview shows what turning them on
  // brings; only on the steps that show it, since it plans a week ahead.
  const previewing =
    signals && (step === 'reminders' || step === 'widgets')
      ? plan({
          ...signals,
          preferences: {
            ...signals.preferences,
            notifications: { ...notifications, windows: true, lookAhead: true, prayers: true },
          },
        })
      : null

  const go = (to: number): void => {
    if (actions.stepControl) actions.stepControl.go(to)
    else setThing((current) => ({ ...current, index: to }))
  }

  const finish = (destination?: OnboardingDestination): void => {
    // The host hears first, so a destination is in place before completing
    // swaps the flow out (mobile); a navigation (the web) runs after either way.
    actions.onComplete?.(destination)
    setOnboarding({ ...onboarding, completed: true, completedAt: new Date().toISOString() })
  }

  const advance = (): void => {
    if (index >= steps.length - 1) {
      finish()
      return
    }
    go(index + 1)
  }

  const enableAnnouncements = actions.enableAnnouncements
  /** The announcements to turn on with the permission, if they were chosen. */
  const announce = thing.announcements ? enableAnnouncements : undefined

  const next = (): void => {
    // The permission prompt belongs to the button that asks for it, not to
    // the Today tab some time later, and one prompt covers both kinds of
    // notification. Where there is nothing to ask (the web), or nothing was
    // chosen, this just advances.
    const ask = actions.ensureReminderPermission
    if (step === 'reminders' && (anyReminder || announce) && ask) {
      // Advance whatever the prompt does; a rejection is handled here, not left unhandled.
      void ask().then((granted) => {
        // Refused, announcements stay off; reminders stay as chosen, for
        // when the permission is given later in system settings.
        if (granted && announce) {
          announce().catch(() => {
            // Logged by the host; the switch in More shows what stuck.
          })
        }
        advance()
      }, advance)
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

  const now = signals?.now ?? new Date()

  return {
    step,
    stepIndex: index,
    stepCount: steps.length,
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
    enabledCount: enabled.length,
    trackingPaused: userState.trackingPaused,
    accent,
    sourced: sourcedExample(items),
    reminderPreview:
      previewing && actions.ensureReminderPermission
        ? reminderPreview(previewing, items, strings, now)
        : null,
    widgetPreview:
      previewing && actions.widgets ? widgetPreview(previewing, items, strings, now) : null,
    widgetGuide: actions.widgets ? { ...actions.widgets, open: thing.widgetGuide } : null,
    onSelectLanguage: chooseLanguage,
    onSelectTheme: actions.onSelectTheme,
    onSelectAccent: (chosen: AccentName) => setAccent(chosen),
    onQueryChange: (query: string) => setThing((current) => ({ ...current, query })),
    onUseDevice: useDevice,
    onSelectPlace: choosePlace,
    onSelectGender: (gender: Gender) => setOnboarding({ ...onboarding, gender }),
    onToggleReminders: (on: boolean) => {
      const { windows, lookAhead } = DEFAULT_NOTIFICATION_PREFERENCES
      setNotificationPreferences(
        on
          ? { ...notifications, windows, lookAhead }
          : { ...notifications, windows: false, lookAhead: false },
      )
    },
    onTogglePrayers: (on: boolean) => setNotificationPreferences({ ...notifications, prayers: on }),
    onSelectPreset: (preset: StarterPreset) => setEnabledItems(idsForPreset(preset, items)),
    onNext: next,
    onBack: () => go(Math.max(0, index - 1)),
    onSkipIntro: () => go(steps.indexOf('location')),
    onNotNow: advance,
    onShowWidgets: () => setThing((current) => ({ ...current, widgetGuide: true })),
    onCloseWidgets: () => setThing((current) => ({ ...current, widgetGuide: false })),
    onOpenSetting: (row: SetupRowId) => finish(SETTING_PATHS[row]),
    onOpenAbout: () => finish(ABOUT_PATH),
    announcements: enableAnnouncements
      ? {
          on: thing.announcements,
          onChange: (on: boolean) => setThing((current) => ({ ...current, announcements: on })),
        }
      : undefined,
  }
}
