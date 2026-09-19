import type { ReactElement, ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { FadeInRight, useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { assertNever } from '@/assert-never'
import { ArabicText } from '@/components/arabic-text'
import { Button } from '@/components/button'
import { OnboardingArt } from '@/components/onboarding-art'
import { Row } from '@/components/row'
import { isRightToLeft, SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/locale'
import type { Place } from '@/location/place'
import type { Gender } from '@/onboarding/store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { useStrings } from '@/strings'
import { colors, paletteFor, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { THEME_PREFERENCES, useEffectiveColorScheme, type ThemePreference } from '@/theme/store'

export type OnboardingStep = 'welcome' | 'how' | 'location' | 'you' | 'reminders' | 'start'
export type StarterPreset = 'essentials' | 'everything'
export type LocationProblem = 'declined' | 'unavailable' | null

export interface OnboardingScreenProps {
  step: OnboardingStep
  stepIndex: number
  stepCount: number
  locale: SupportedLocale
  theme: ThemePreference
  place: Place | null
  problem: LocationProblem
  query: string
  results: Place[]
  gender: Gender
  notifications: NotificationPreferences
  preset: StarterPreset
  itemCount: number
  essentialCount: number
  onSelectLocale: (locale: SupportedLocale) => void
  onSelectTheme: (theme: ThemePreference) => void
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onSelectPlace: (place: Place) => void
  onSelectGender: (gender: Gender) => void
  onToggleNotification: (change: Partial<NotificationPreferences>) => void
  onSelectPreset: (preset: StarterPreset) => void
  onNext: () => void
  onBack: () => void
  onSkipIntro: () => void
  onNotNow: () => void
}

interface HeadingProps {
  title: string
  body: string
}

function Heading({ title, body }: HeadingProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <Text
        className="text-4xl leading-tight"
        style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
        {title}
      </Text>
      <Text className="text-base leading-relaxed" style={{ color: colors.secondaryLabel }}>
        {body}
      </Text>
    </View>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-2">
      <Text
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
  palette: Palette
}

function Chip({ label, selected, onPress, palette }: ChipProps): ReactElement {
  useColorScheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="rounded-full px-3 py-2"
      style={{ backgroundColor: selected ? palette.accent : colors.secondarySystemBackground }}>
      <Text
        className="text-sm font-semibold"
        style={{ color: selected ? palette.onAccent : colors.label }}>
        {label}
      </Text>
    </Pressable>
  )
}

interface DotsProps {
  count: number
  index: number
  accent: string
}

function Dots({ count, index, accent }: DotsProps): ReactElement {
  useColorScheme()

  return (
    <View className="flex-row justify-center gap-1.5">
      {Array.from({ length: count }, (_, position) => (
        <View
          key={position}
          className="h-1.5 rounded-full"
          style={{
            width: position === index ? 20 : 6,
            backgroundColor: position === index ? accent : colors.separator,
          }}
        />
      ))}
    </View>
  )
}

interface StepBodyProps extends OnboardingScreenProps {
  palette: Palette
}

function StepBody(props: StepBodyProps): ReactElement {
  const strings = useStrings()
  useColorScheme()
  const { step, palette } = props

  switch (step) {
    case 'welcome':
      return (
        <>
          <View className="flex-1 items-center justify-center py-6">
            <OnboardingArt variant="welcome" color={palette.accent} onColor={palette.onAccent} />
          </View>
          <Heading title={strings.onboarding.welcomeTitle} body={strings.onboarding.welcomeBody} />
          <Field label={strings.onboarding.language}>
            <View className="flex-row flex-wrap gap-2">
              {SUPPORTED_LOCALES.map((option) => (
                <Chip
                  key={option}
                  label={strings.language.names[option] ?? option}
                  selected={props.locale === option}
                  onPress={() => props.onSelectLocale(option)}
                  palette={palette}
                />
              ))}
            </View>
          </Field>
          <Field label={strings.onboarding.appearance}>
            <View className="flex-row gap-2">
              {THEME_PREFERENCES.map((option) => (
                <Chip
                  key={option}
                  label={strings.appearance[option]}
                  selected={props.theme === option}
                  onPress={() => props.onSelectTheme(option)}
                  palette={palette}
                />
              ))}
            </View>
          </Field>
          {isRightToLeft(props.locale) ? (
            <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
              {strings.language.restart}
            </Text>
          ) : null}
        </>
      )

    case 'how':
      return (
        <>
          <View className="flex-1 items-center justify-center py-6">
            <OnboardingArt variant="how" color={palette.accent} onColor={palette.onAccent} />
          </View>
          <Heading title={strings.onboarding.howTitle} body={strings.onboarding.howBody} />
          <ArabicText>{strings.onboarding.howSample}</ArabicText>
        </>
      )

    case 'location':
      return (
        <>
          <Heading title={strings.onboarding.locationStep} body={strings.onboarding.locationWhy} />
          <Row
            title={strings.location.useDevice}
            detail={props.place?.label ?? null}
            onPress={props.onUseDevice}
          />
          {props.problem ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {strings.location[props.problem]}
            </Text>
          ) : null}
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
      )

    case 'you':
      return (
        <>
          <Heading title={strings.onboarding.genderStep} body={strings.onboarding.genderWhy} />
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
      )

    case 'reminders':
      return (
        <>
          <Heading
            title={strings.onboarding.remindersStep}
            body={strings.onboarding.remindersWhy}
          />
          <Row
            title={strings.notifications.windows}
            detail={strings.onboarding.windowsDetail}
            selected={props.notifications.windows}
            onPress={() => props.onToggleNotification({ windows: !props.notifications.windows })}
          />
          <Row
            title={strings.notifications.lookAhead}
            detail={strings.onboarding.lookAheadDetail}
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
      )

    case 'start':
      return (
        <>
          <Heading title={strings.onboarding.startStep} body={strings.onboarding.startWhy} />
          <Row
            title={strings.onboarding.essentials}
            detail={strings.onboarding.essentialsDetail(props.essentialCount)}
            selected={props.preset === 'essentials'}
            onPress={() => props.onSelectPreset('essentials')}
          />
          <Row
            title={strings.onboarding.everything}
            detail={strings.onboarding.everythingDetail(props.itemCount)}
            selected={props.preset === 'everything'}
            onPress={() => props.onSelectPreset('everything')}
          />
        </>
      )

    default:
      return assertNever(step)
  }
}

export function OnboardingScreen(props: OnboardingScreenProps): ReactElement {
  const strings = useStrings()
  useColorScheme()
  const palette = paletteFor(useEffectiveColorScheme())
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  const { step } = props
  const intro = step === 'welcome' || step === 'how'
  const anyReminder =
    props.notifications.windows || props.notifications.lookAhead || props.notifications.prayers
  const asking = step === 'reminders' && anyReminder

  const primary =
    step === 'start'
      ? strings.onboarding.done
      : asking
        ? strings.onboarding.allowReminders
        : strings.onboarding.continue

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <LinearGradient
        colors={palette.wash}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top, minHeight: insets.top + 48 }}>
        {props.stepIndex > 0 ? (
          <Button
            variant="secondary"
            title={strings.onboarding.back}
            onPress={props.onBack}
            color={palette.accent}
          />
        ) : (
          <View />
        )}
        {intro ? (
          <Button
            variant="secondary"
            title={strings.onboarding.skipIntro}
            onPress={props.onSkipIntro}
            color={palette.accent}
          />
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 pb-4"
        keyboardShouldPersistTaps="handled">
        <Animated.View
          key={step}
          entering={reduceMotion ? undefined : FadeInRight.duration(260)}
          style={{ flex: 1 }}>
          <View className="flex-1 gap-5">
            <StepBody {...props} palette={palette} />
          </View>
        </Animated.View>
      </ScrollView>

      <View className="gap-2 px-6 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
        <Dots count={props.stepCount} index={props.stepIndex} accent={palette.accent} />
        <View className="pt-2">
          <Button
            title={primary}
            onPress={props.onNext}
            color={palette.accent}
            onColor={palette.onAccent}
          />
        </View>
        {asking ? (
          <Button
            variant="secondary"
            title={strings.onboarding.notNow}
            onPress={props.onNotNow}
            color={palette.accent}
          />
        ) : null}
      </View>
    </View>
  )
}
