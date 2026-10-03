import { assertNever } from '@ihsaanly/core/assert-never'
import {
  isRightToLeft,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@ihsaanly/core/i18n/locale'
import type { Place } from '@ihsaanly/core/location/place'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { type Palette, palettes } from '@ihsaanly/tailwind/tokens'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement, ReactNode } from 'react'
import {
  ActivityIndicator,
  type ColorValue,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeInRight, useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Chip } from '../components/chip'
import { ChoiceRow } from '../components/choice-row'
import { OnboardingArt } from '../components/onboarding-art'
import { PlaceMap } from '../components/place-map'
import { Row } from '../components/row'
import { Surface } from '../components/surface'
import { SwitchRow } from '../components/switch-row'
import { TextField } from '../components/text-field'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { Gender, OptIn } from '../types'
import { THEME_PREFERENCES, type ThemePreference } from '../types'

export type OnboardingStep = 'welcome' | 'how' | 'location' | 'you' | 'reminders' | 'start'

import type { StarterPreset } from '@ihsaanly/core/plan/presets'

export type { StarterPreset }
export type LocationProblem = 'declined' | 'unavailable' | null

export interface OnboardingScreenProps {
  step: OnboardingStep
  stepIndex: number
  stepCount: number
  language: SupportedLanguage
  theme: ThemePreference
  place: Place | null
  locating: boolean
  problem: LocationProblem
  query: string
  results: Place[]
  gender: Gender
  notifications: NotificationPreferences
  preset: StarterPreset | null
  enabledTitles: string[]
  itemCount: number
  essentialCount: number
  startingCount: number
  onSelectLanguage: (language: SupportedLanguage) => void
  onSelectTheme: (theme: ThemePreference) => void
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onSelectPlace: (place: Place) => void
  onSelectGender: (gender: Gender) => void
  /**
   * The "Daily reminders" switch: the reminders scheduled on this device, on
   * (the default categories) or off (every category).
   */
  onToggleReminders: (on: boolean) => void
  onSelectPreset: (preset: StarterPreset) => void
  onNext: () => void
  onBack: () => void
  onSkipIntro: () => void
  onNotNow: () => void
  /**
   * Opens sign-in for someone who already has an account, whose synced setup
   * then replaces this flow. Omitted in a local-only build, which hides it.
   */
  onRestore?: () => void
  /**
   * The "Announcements from Ihsaanly" choice on the reminders step: off until
   * chosen, and applied only once notifications are allowed. Only a build that
   * can receive push offers it; the others leave it out and show no switch.
   */
  announcements?: OptIn | undefined
}

function remindersOn(notifications: NotificationPreferences): boolean {
  return notifications.windows || notifications.lookAhead || notifications.prayers
}

/** Whether the reminders step has anything to ask the OS permission for. */
function wantsNotifications(props: OnboardingScreenProps): boolean {
  return remindersOn(props.notifications) || props.announcements?.on === true
}

interface HeadingProps {
  title: string
  body: string
}

function Heading({ title, body }: HeadingProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-3">
      <Text
        className="text-4xl leading-tight"
        style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
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
  const colors = useColors()
  return (
    <View className="gap-2">
      <Text
        accessibilityRole="header"
        aria-level={2}
        className="font-semibold text-xs uppercase tracking-wide"
        style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

interface DotsProps {
  count: number
  index: number
}

function Dots({ count, index }: DotsProps): ReactElement {
  const colors = useColors()
  const accent = palettes[useUi().scheme].accent
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

/** City labels arrive as "Toronto, Ontario, Canada"; the first part is the city. */
function cityOf(label: string): string {
  return label.split(',')[0]?.trim() ?? label
}

function regionOf(label: string): string | null {
  const rest = label.split(',').slice(1).join(',').trim()
  return rest.length > 0 ? rest : null
}

interface GlyphProps {
  accent: string
  onAccent: string
  active: boolean
  busy: boolean
}

function LocationGlyph({ accent, onAccent, active, busy }: GlyphProps): ReactElement {
  return (
    <View
      className="items-center justify-center rounded-full border-2"
      style={{
        width: 52,
        height: 52,
        borderColor: accent,
        backgroundColor: active ? accent : undefined,
      }}>
      {busy ? (
        <ActivityIndicator color={active ? onAccent : accent} />
      ) : (
        <View
          className="rounded-full"
          style={{ width: 14, height: 14, backgroundColor: active ? onAccent : accent }}
        />
      )}
    </View>
  )
}

interface PlaceCardProps {
  place: Place | null
  locating: boolean
  problem: LocationProblem
  palette: Palette
  onPress: () => void
}

/** One card that is the call to action, the progress, the result, or the reason it failed. */
function PlaceCard({ place, locating, problem, palette, onPress }: PlaceCardProps): ReactElement {
  const colors = useColors()
  const strings = useUi().strings

  const title = locating
    ? strings.location.locating
    : place
      ? cityOf(place.label)
      : strings.location.useDevice
  const detail = locating
    ? null
    : place
      ? regionOf(place.label)
      : problem
        ? strings.location[problem]
        : strings.location.useDeviceDetail

  const settled = place !== null && !locating

  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={locating}>
      <Surface interactive style={{ borderRadius: 24, padding: 20 }}>
        {settled ? (
          <View className="pb-4">
            <PlaceMap
              latitude={place.latitude}
              longitude={place.longitude}
              accent={palette.accent}
              onAccent={palette.onAccent}
            />
          </View>
        ) : null}
        <View className="flex-row items-center gap-4">
          {settled ? null : (
            <LocationGlyph
              accent={palette.accent}
              onAccent={palette.onAccent}
              active={place !== null}
              busy={locating}
            />
          )}
          <View className="flex-1 gap-1">
            <Text
              className="text-xl"
              style={{
                color: colors.label,
                fontFamily: place && !locating ? serif : undefined,
                fontWeight: '600',
              }}>
              {title}
            </Text>
            {detail ? (
              <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>
        {place && !locating ? (
          <Text className="pt-3 text-xs" style={{ color: colors.secondaryLabel }}>
            {strings.location.follows}
          </Text>
        ) : null}
      </Surface>
    </Pressable>
  )
}

interface PersonGlyphProps {
  variant: 'brother' | 'sister'
  color: ColorValue
}

/**
 * Two silhouettes drawn from plain views: a round head over shoulders, and a
 * draped one that meets the shoulders without a break. Deliberately abstract,
 * and no icon dependency for two glyphs.
 */
function PersonGlyph({ variant, color }: PersonGlyphProps): ReactElement {
  const shoulders = (
    <View
      style={{
        backgroundColor: color,
        width: 36,
        height: 15,
        borderTopStartRadius: 18,
        borderTopEndRadius: 18,
      }}
    />
  )

  if (variant === 'sister') {
    return (
      <View className="items-center" style={{ height: 52, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: color,
            width: 26,
            height: 33,
            borderTopStartRadius: 13,
            borderTopEndRadius: 13,
            borderBottomStartRadius: 5,
            borderBottomEndRadius: 5,
          }}
        />
        {shoulders}
      </View>
    )
  }

  return (
    <View className="items-center" style={{ height: 52, justifyContent: 'flex-end' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color }} />
      <View style={{ height: 5 }} />
      {shoulders}
    </View>
  )
}

interface ChoiceTileProps {
  variant: 'brother' | 'sister'
  title: string
  detail: string
  selected: boolean
  palette: Palette
  onPress: () => void
}

/** One of a pair, so the selection reads as a ring around the whole tile. */
function ChoiceTile({
  variant,
  title,
  detail,
  selected,
  palette,
  onPress,
}: ChoiceTileProps): ReactElement {
  const colors = useColors()
  const { systemColors } = useUi()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      // react-native-web reads only the aria-* form; a radio's state is aria-checked.
      aria-checked={selected}
      onPress={onPress}
      className="flex-1">
      <Surface
        interactive
        style={{
          borderRadius: 20,
          paddingVertical: 20,
          paddingHorizontal: 12,
          borderWidth: 2,
          borderColor: selected ? palette.accent : 'transparent',
        }}>
        <View className="items-center gap-3">
          <PersonGlyph
            variant={variant}
            color={selected ? palette.accent : systemColors.secondaryLabel}
          />
          <View className="items-center gap-1">
            <Text className="font-semibold text-base" style={{ color: colors.label }}>
              {title}
            </Text>
            <Text className="text-center text-xs" style={{ color: colors.secondaryLabel }}>
              {detail}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  )
}

interface StepBodyProps extends OnboardingScreenProps {
  palette: Palette
}

function StepBody(props: StepBodyProps): ReactElement {
  const colors = useColors()
  const strings = useUi().strings
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
              {SUPPORTED_LANGUAGES.map((option) => (
                <Chip
                  key={option}
                  label={strings.language.names[option]}
                  selected={props.language === option}
                  onPress={() => props.onSelectLanguage(option)}
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
          {isRightToLeft(props.language) ? (
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
          <Text
            className="text-center text-3xl leading-tight"
            style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
            {strings.onboarding.howTitle}
          </Text>
        </>
      )

    case 'location':
      return (
        <>
          <Heading title={strings.onboarding.locationStep} body={strings.onboarding.locationWhy} />
          <PlaceCard
            place={props.place}
            locating={props.locating}
            problem={props.problem}
            palette={palette}
            onPress={props.onUseDevice}
          />
          <View className="flex-row items-center gap-3 pt-1">
            <View className="h-px flex-1" style={{ backgroundColor: colors.separator }} />
            <Text
              className="font-semibold text-xs uppercase tracking-wide"
              style={{ color: colors.secondaryLabel }}>
              {strings.location.orSearch}
            </Text>
            <View className="h-px flex-1" style={{ backgroundColor: colors.separator }} />
          </View>
          <TextField
            value={props.query}
            onChangeText={props.onQueryChange}
            placeholder={strings.location.search}
            kind="search"
            returnKeyType="search"
            accent={palette.accent}
          />
          {props.results.slice(0, 6).map((result) => (
            <Row
              key={result.label}
              title={cityOf(result.label)}
              detail={regionOf(result.label)}
              selected={props.place?.label === result.label}
              onPress={() => {
                // Otherwise the keyboard stays up over the place card the
                // selection just revealed.
                Keyboard.dismiss()
                props.onSelectPlace(result)
              }}
            />
          ))}
          {props.query.trim().length >= 2 && props.results.length === 0 ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {strings.location.noResults}
            </Text>
          ) : null}
        </>
      )

    case 'you':
      return (
        <>
          <Heading title={strings.onboarding.genderStep} body={strings.onboarding.genderWhy} />
          <View className="flex-row gap-3">
            <ChoiceTile
              variant="brother"
              title={strings.onboarding.brother}
              detail={strings.onboarding.brotherDetail}
              selected={props.gender === 'male'}
              palette={palette}
              onPress={() => props.onSelectGender('male')}
            />
            <ChoiceTile
              variant="sister"
              title={strings.onboarding.sister}
              detail={strings.onboarding.sisterDetail}
              selected={props.gender === 'female'}
              palette={palette}
              onPress={() => props.onSelectGender('female')}
            />
          </View>
          <ChoiceRow
            title={strings.onboarding.skip}
            detail={strings.onboarding.skipDetail}
            selected={props.gender === 'unspecified'}
            accent={palette.accent}
            onPress={() => props.onSelectGender('unspecified')}
          />
          <Text className="pt-1 text-xs leading-snug" style={{ color: colors.secondaryLabel }}>
            {strings.onboarding.genderPrivacy}
          </Text>
        </>
      )

    case 'reminders': {
      const quiet = props.notifications.quietHours
      const daily = remindersOn(props.notifications)
      const announcements = props.announcements

      return (
        <>
          <Heading
            title={strings.onboarding.remindersStep}
            body={strings.onboarding.remindersWhy}
          />
          <SwitchRow
            title={strings.onboarding.dailyReminders}
            detail={strings.onboarding.dailyRemindersDetail}
            value={daily}
            onValueChange={props.onToggleReminders}
            accent={palette.accent}
            knob={palette.knob}
            track={palette.wash[1]}
          />
          {announcements ? (
            <SwitchRow
              title={strings.onboarding.announcementsChoice}
              detail={strings.onboarding.announcementsChoiceDetail}
              value={announcements.on}
              onValueChange={announcements.onChange}
              accent={palette.accent}
              knob={palette.knob}
              track={palette.wash[1]}
            />
          ) : null}
          {daily ? (
            <Text className="pt-1 text-xs leading-snug" style={{ color: colors.secondaryLabel }}>
              {quiet
                ? strings.onboarding.reminderPolicy(
                    props.notifications.maxPerDay,
                    quiet.from,
                    quiet.to,
                  )
                : strings.onboarding.reminderCap(props.notifications.maxPerDay)}
            </Text>
          ) : null}
        </>
      )
    }

    case 'start': {
      const preview = props.enabledTitles.slice(0, 5)
      const rest = props.enabledTitles.length - preview.length

      return (
        <>
          <Heading title={strings.onboarding.startStep} body={strings.onboarding.startWhy} />
          <ChoiceRow
            title={strings.onboarding.starting}
            detail={strings.onboarding.startingDetail(props.startingCount)}
            selected={props.preset === 'starting'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('starting')}
          />
          <ChoiceRow
            title={strings.onboarding.essentials}
            detail={strings.onboarding.essentialsDetail(props.essentialCount)}
            selected={props.preset === 'essentials'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('essentials')}
          />
          <ChoiceRow
            title={strings.onboarding.everything}
            detail={strings.onboarding.everythingDetail(props.itemCount)}
            selected={props.preset === 'everything'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('everything')}
          />
          <View className="gap-2 pt-2">
            <Text
              accessibilityRole="header"
              aria-level={2}
              className="font-semibold text-xs uppercase tracking-wide"
              style={{ color: colors.secondaryLabel }}>
              {strings.onboarding.included}
            </Text>
            {preview.map((title) => (
              <View key={title} className="flex-row items-center gap-3">
                <View
                  className="rounded-full"
                  style={{ backgroundColor: palette.accent, width: 5, height: 5 }}
                />
                <Text className="flex-1 text-sm" style={{ color: colors.label }}>
                  {title}
                </Text>
              </View>
            ))}
            {rest > 0 ? (
              <Text className="ps-8 text-sm" style={{ color: colors.secondaryLabel }}>
                {strings.onboarding.andMore(rest)}
              </Text>
            ) : null}
          </View>
        </>
      )
    }

    default:
      return assertNever(step)
  }
}

export function OnboardingScreen(props: OnboardingScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  const { step } = props
  const intro = step === 'welcome' || step === 'how'
  const asking = step === 'reminders' && wantsNotifications(props)
  const needsPlace = step === 'location' && props.place === null

  // Every way past a step sits beside Back, so the footer is the same height
  // on all six and the primary button never moves under the thumb.
  const escape = intro
    ? { title: strings.onboarding.skipIntro, onPress: props.onSkipIntro }
    : asking
      ? { title: strings.onboarding.notNow, onPress: props.onNotNow }
      : needsPlace
        ? { title: strings.onboarding.skipLocation, onPress: props.onNext }
        : null

  const primary =
    step === 'start'
      ? strings.onboarding.done
      : asking
        ? strings.onboarding.allowNotifications
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
        {escape ? (
          <Button
            variant="secondary"
            title={escape.title}
            onPress={escape.onPress}
            color={palette.accent}
          />
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 pb-4"
        // The same reading column as Screen, so a tablet is not edge to edge.
        contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}
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

      <View
        className="gap-2 px-6 pt-2"
        style={{
          paddingBottom: insets.bottom + 12,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}>
        <Dots count={props.stepCount} index={props.stepIndex} />
        <View className="pt-2">
          <Button
            title={primary}
            onPress={props.onNext}
            color={palette.accent}
            onColor={palette.onAccent}
            disabled={needsPlace}
          />
          {step === 'welcome' && props.onRestore ? (
            <Button
              variant="secondary"
              title={strings.onboarding.restore}
              onPress={props.onRestore}
              color={palette.accent}
            />
          ) : null}
        </View>
      </View>
    </View>
  )
}
