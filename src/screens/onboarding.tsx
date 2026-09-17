import type { ReactElement } from 'react'
import { Text, TextInput, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { Place } from '@/location/place'
import type { Gender } from '@/onboarding/store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

export type OnboardingStep = 'intro' | 'location' | 'gender' | 'reminders' | 'start'

export interface StarterItem {
  id: string
  title: string
  enabled: boolean
}

export interface OnboardingScreenProps {
  step: OnboardingStep
  place: Place | null
  query: string
  results: Place[]
  gender: Gender
  notifications: NotificationPreferences
  starters: StarterItem[]
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onSelectPlace: (place: Place) => void
  onSelectGender: (gender: Gender) => void
  onToggleNotification: (change: Partial<NotificationPreferences>) => void
  onToggleStarter: (id: string) => void
  onNext: () => void
}

function Heading({ title, why }: { title: string; why: string }): ReactElement {
  useColorScheme()

  return (
    <View className="gap-2">
      <Text className="text-2xl font-semibold" style={{ color: colors.label }}>
        {title}
      </Text>
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {why}
      </Text>
    </View>
  )
}

export function OnboardingScreen(props: OnboardingScreenProps): ReactElement {
  useColorScheme()

  const { step, onNext } = props

  return (
    <Screen className="gap-6 p-4">
      {step === 'intro' ? (
        <Heading title={strings.onboarding.title} why={strings.onboarding.intro} />
      ) : null}

      {step === 'location' ? (
        <>
          <Heading title={strings.onboarding.locationStep} why={strings.onboarding.locationWhy} />
          <Row
            title={strings.location.useDevice}
            detail={props.place?.label ?? null}
            onPress={props.onUseDevice}
          />
          <TextInput
            value={props.query}
            onChangeText={props.onQueryChange}
            placeholder={strings.location.search}
            placeholderTextColor={colors.secondaryLabel}
            autoCorrect={false}
            className="rounded-2xl px-4 py-3 text-base"
            style={{ backgroundColor: colors.secondarySystemBackground, color: colors.label }}
          />
          {props.results.map((result) => (
            <Row
              key={result.label}
              title={result.label}
              selected={props.place?.label === result.label}
              onPress={() => props.onSelectPlace(result)}
            />
          ))}
        </>
      ) : null}

      {step === 'gender' ? (
        <>
          <Heading title={strings.onboarding.genderStep} why={strings.onboarding.genderWhy} />
          {(['female', 'male', 'unspecified'] as const).map((option) => (
            <Row
              key={option}
              title={
                option === 'female'
                  ? strings.onboarding.female
                  : option === 'male'
                    ? strings.onboarding.male
                    : strings.onboarding.skip
              }
              selected={props.gender === option}
              onPress={() => props.onSelectGender(option)}
            />
          ))}
        </>
      ) : null}

      {step === 'reminders' ? (
        <>
          <Heading title={strings.onboarding.remindersStep} why={strings.onboarding.remindersWhy} />
          <Row
            title={strings.notifications.windows}
            selected={props.notifications.windows}
            onPress={() => props.onToggleNotification({ windows: !props.notifications.windows })}
          />
          <Row
            title={strings.notifications.lookAhead}
            selected={props.notifications.lookAhead}
            onPress={() =>
              props.onToggleNotification({ lookAhead: !props.notifications.lookAhead })
            }
          />
          <Row
            title={strings.notifications.prayers}
            detail={strings.notifications.prayersDetail}
            selected={props.notifications.prayers}
            onPress={() => props.onToggleNotification({ prayers: !props.notifications.prayers })}
          />
        </>
      ) : null}

      {step === 'start' ? (
        <>
          <Heading title={strings.onboarding.startStep} why={strings.onboarding.startWhy} />
          {props.starters.map((starter) => (
            <Row
              key={starter.id}
              title={starter.title}
              selected={starter.enabled}
              onPress={() => props.onToggleStarter(starter.id)}
            />
          ))}
        </>
      ) : null}

      <Row
        title={step === 'start' ? strings.onboarding.done : strings.onboarding.next}
        onPress={onNext}
      />
    </Screen>
  )
}
