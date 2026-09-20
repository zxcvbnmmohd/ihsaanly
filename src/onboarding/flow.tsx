import { useState, type ReactElement } from 'react'

import { items, resolveText } from '@/content'
import { supportedLanguageOf } from '@/i18n/locale'
import { chooseLanguage, useLocale } from '@/i18n/store'
import { searchCities } from '@/location/cities'
import { requestDeviceLocation } from '@/location/device'
import type { Place } from '@/location/place'
import { setPlace, usePlace } from '@/location/store'
import { ensurePermission } from '@/notifications/schedule'
import { setNotificationPreferences, useNotificationPreferences } from '@/notifications/store'
import { setEnabledItems, useEnabledItems } from '@/plan/enabled-store'
import { idsForPreset, presetFor } from '@/plan/presets'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import {
  OnboardingScreen,
  type LocationProblem,
  type OnboardingStep,
  type StarterPreset,
} from '@/screens/onboarding'
import { getStrings } from '@/strings'
import { setThemePreference, useThemePreference } from '@/theme/store'

import { setOnboarding, useOnboarding, type Gender } from './store'

const STEPS: OnboardingStep[] = ['welcome', 'how', 'location', 'you', 'reminders', 'start']
const SETUP_INDEX = STEPS.indexOf('location')

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
export function OnboardingFlow(): ReactElement {
  const [thing, setThing] = useState<Thing>({ index: 0, query: '', problem: null, locating: false })
  const place = usePlace()
  const onboarding = useOnboarding()
  const notifications = useNotificationPreferences()
  const enabled = useEnabledItems()
  const locale = useLocale()
  const theme = useThemePreference()

  const step = STEPS[thing.index] ?? 'start'
  const anyReminder = notifications.windows || notifications.lookAhead || notifications.prayers

  const go = (index: number): void => setThing((current) => ({ ...current, index }))

  const advance = (): void => {
    if (thing.index >= STEPS.length - 1) {
      setOnboarding({ ...onboarding, completed: true, completedAt: new Date().toISOString() })
      return
    }
    go(thing.index + 1)
  }

  const next = (): void => {
    // The permission prompt belongs to the button that asks for it, not to
    // the Today tab some time later.
    if (step === 'reminders' && anyReminder) {
      void ensurePermission(getStrings()).finally(advance)
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
    requestDeviceLocation()
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

  return (
    <OnboardingScreen
      step={step}
      stepIndex={thing.index}
      stepCount={STEPS.length}
      language={supportedLanguageOf(locale)}
      theme={theme}
      place={place}
      locating={thing.locating}
      problem={thing.problem}
      query={thing.query}
      results={searchCities(thing.query)}
      gender={onboarding.gender}
      notifications={notifications}
      preset={presetFor(enabled, items)}
      enabledTitles={items
        .filter((item) => enabled.includes(item.id))
        .map((item) => resolveText(item.title) ?? item.id)}
      itemCount={items.length}
      essentialCount={idsForPreset('essentials', items).length}
      startingCount={idsForPreset('starting', items).length}
      onSelectLanguage={chooseLanguage}
      onSelectTheme={setThemePreference}
      onQueryChange={(query) => setThing((current) => ({ ...current, query }))}
      onUseDevice={useDevice}
      onSelectPlace={choosePlace}
      onSelectGender={(gender: Gender) => setOnboarding({ ...onboarding, gender })}
      onToggleNotification={(change: Partial<NotificationPreferences>) =>
        setNotificationPreferences({ ...notifications, ...change })
      }
      onSelectPreset={(preset: StarterPreset) => setEnabledItems(idsForPreset(preset, items))}
      onNext={next}
      onBack={() => go(Math.max(0, thing.index - 1))}
      onSkipIntro={() => go(SETUP_INDEX)}
      onNotNow={advance}
    />
  )
}
