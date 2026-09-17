import { useState, type ReactElement } from 'react'

import { items, resolveText } from '@/content'
import { searchCities } from '@/location/cities'
import { requestDeviceLocation } from '@/location/device'
import type { Place } from '@/location/place'
import { setPlace, usePlace } from '@/location/store'
import { setNotificationPreferences, useNotificationPreferences } from '@/notifications/store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { setEnabledItems, useEnabledItems } from '@/plan/enabled-store'
import { OnboardingScreen, type OnboardingStep } from '@/screens/onboarding'

import { setOnboarding, useOnboarding, type Gender } from './store'

const STEPS: OnboardingStep[] = ['intro', 'location', 'gender', 'reminders', 'start']

interface Thing {
  index: number
  query: string
}

/**
 * Five screens, every one with an answer already chosen, so someone new can
 * accept their way through and arrive at a reasonable day without having to
 * understand the choices yet.
 */
export function OnboardingFlow(): ReactElement {
  const [thing, setThing] = useState<Thing>({ index: 0, query: '' })
  const place = usePlace()
  const onboarding = useOnboarding()
  const notifications = useNotificationPreferences()
  const enabled = useEnabledItems()

  const step = STEPS[thing.index] ?? 'start'

  const advance = (): void => {
    if (thing.index >= STEPS.length - 1) {
      setOnboarding({ ...onboarding, completed: true })
      return
    }
    setThing((current) => ({ ...current, index: current.index + 1 }))
  }

  const choosePlace = (chosen: Place): void => {
    setPlace(chosen)
    setThing((current) => ({ ...current, query: '' }))
  }

  return (
    <OnboardingScreen
      step={step}
      place={place}
      query={thing.query}
      results={searchCities(thing.query)}
      gender={onboarding.gender}
      notifications={notifications}
      starters={items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        enabled: enabled.includes(item.id),
      }))}
      onQueryChange={(query) => setThing((current) => ({ ...current, query }))}
      onUseDevice={() => {
        void requestDeviceLocation().then((located) => {
          if (located.status === 'ok') choosePlace(located.place)
        })
      }}
      onSelectPlace={choosePlace}
      onSelectGender={(gender: Gender) => setOnboarding({ ...onboarding, gender })}
      onToggleNotification={(change: Partial<NotificationPreferences>) =>
        setNotificationPreferences({ ...notifications, ...change })
      }
      onToggleStarter={(id) =>
        setEnabledItems(
          enabled.includes(id) ? enabled.filter((entry) => entry !== id) : [...enabled, id],
        )
      }
      onNext={advance}
    />
  )
}
