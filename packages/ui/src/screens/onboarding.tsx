import { assertNever } from '@ihsaanly/core/assert-never'
import type { Evidence } from '@ihsaanly/core/content/schema'
import {
  isRightToLeft,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@ihsaanly/core/i18n/locale'
import { cityOf, type Place } from '@ihsaanly/core/location/place'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { AccentName, Palette } from '@ihsaanly/tailwind/tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { type ReactElement, type ReactNode, useState } from 'react'
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
import { useColors, usePalette } from '../colors'
import { AccentPicker } from '../components/accent-picker'
import { Button } from '../components/button'
import { ChoiceRow } from '../components/choice-row'
import { Dropdown } from '../components/dropdown'
import { citationFor } from '../components/evidence-panel'
import { NotificationMock } from '../components/notification-mock'
import { NumberedSteps } from '../components/numbered-steps'
import { OnboardingArt } from '../components/onboarding-art'
import { PageSheet } from '../components/page-sheet'
import { PlaceMap } from '../components/place-map'
import { Row } from '../components/row'
import { Surface } from '../components/surface'
import { SwitchRow } from '../components/switch-row'
import { TextField } from '../components/text-field'
import { WidgetPreview as LiveWidget, type WidgetPreviewModel } from '../components/widget-preview'
import {
  APP_NAME,
  LOCK_INK,
  LockFrame,
  previewInkFor,
  WIDGET_POINTS,
  WidgetFrame,
  type WidgetLook,
  WidgetScene,
  WidgetText,
} from '../components/widget-scene'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { Gender, OptIn } from '../types'
import { THEME_PREFERENCES, type ThemePreference } from '../types'

export type OnboardingStep =
  | 'welcome'
  | 'how'
  | 'sourced'
  | 'location'
  | 'you'
  | 'start'
  | 'reminders'
  | 'accent'
  | 'widgets'
  | 'summary'

/** A notification as it would arrive: the words only, never a clock time. */
export interface NotificationPreview {
  title: string
  body: string
}

/** The two kinds of notification the reminders step shows, from the person's own plan. */
export interface ReminderPreview {
  item: NotificationPreview
  prayer: NotificationPreview
}

/** What the widget step draws: the Right now widget, a Lock Screen one, and a notification. */
export interface WidgetPreview {
  home: { caption: string; title: string; detail: string | null }
  lock: { title: string; detail: string }
  notification: NotificationPreview
}

/** One real item, laid out the way "Every sunnah, sourced" walks through it. */
export interface SourcedExample {
  title: string
  reminder: string | null
  evidence: Evidence
  why: string | null
}

/** A row of the setup summary; each leads to its own setting once onboarding is done. */
export type SetupRowId =
  | 'location'
  | 'reminders'
  | 'tracking'
  | 'start'
  | 'accent'
  | 'widgets'
  | 'language'

/**
 * "Show me how" on the widget step: how to add a widget on this platform,
 * beside a live one, in a sheet over the step.
 */
export interface WidgetGuide {
  /** The sheet is showing. */
  open: boolean
  /** Whose steps to give; Android has no Lock Screen widgets. */
  platform: 'ios' | 'android'
  /** The widgets' entry now, so the preview says what the real widget says. */
  model: WidgetPreviewModel
}

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
  /** How many items are switched on, for the summary's starting point. */
  enabledCount: number
  /** Prayer tracking is paused (the summary says so). */
  trackingPaused: boolean
  accent: AccentName
  /** The sourced step's example; null only if content has nothing citing a hadith. */
  sourced: SourcedExample | null
  /** The reminders step's notifications; null where the host cannot notify (the web). */
  reminderPreview: ReminderPreview | null
  /** The widget step's three surfaces; null where the host has no widgets. */
  widgetPreview: WidgetPreview | null
  /** The widget step's guide, or null where the host has no widgets (the web). */
  widgetGuide: WidgetGuide | null
  onSelectLanguage: (language: SupportedLanguage) => void
  onSelectTheme: (theme: ThemePreference) => void
  /** Stored at once, so the whole flow recolours as the person chooses. */
  onSelectAccent: (accent: AccentName) => void
  onQueryChange: (query: string) => void
  onUseDevice: () => void
  onSelectPlace: (place: Place) => void
  onSelectGender: (gender: Gender) => void
  /**
   * The "Daily reminders" switch: the reminders scheduled on this device, on
   * (the default categories) or off (every category).
   */
  onToggleReminders: (on: boolean) => void
  /** The "Prayer reminders" switch: "Have you prayed?" as each prayer comes in. */
  onTogglePrayers: (on: boolean) => void
  onSelectPreset: (preset: StarterPreset) => void
  onNext: () => void
  onBack: () => void
  onSkipIntro: () => void
  onNotNow: () => void
  /** "Show me how" on the widget step: opens the guide over the step. */
  onShowWidgets: () => void
  /** The guide's Done (or a swipe down): back to the step. */
  onCloseWidgets: () => void
  /** Finishes onboarding and opens the setting behind a summary row. */
  onOpenSetting: (row: SetupRowId) => void
  /** Finishes onboarding and opens About, where donating lives. */
  onOpenAbout: () => void
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

interface Thing {
  height: number
}

interface WelcomeArtProps {
  palette: Palette
}

/** Below this the grid is too small to read as stars, so it is left out. */
const MIN_ART = 72

/**
 * The welcome grid, sized to the height left over once the rest of the step
 * is laid out, so a small phone (an iPhone SE) shows a smaller grid rather
 * than a scrolling step. It is drawn out of the flow, so it never adds height.
 */
function WelcomeArt({ palette }: WelcomeArtProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ height: 0 })
  const size = Math.min(228, thing.height)
  return (
    <View
      testID="welcome-art"
      className="flex-1"
      onLayout={(event) => setThing({ height: event.nativeEvent.layout.height })}>
      {size >= MIN_ART ? (
        <View className="absolute start-0 end-0 top-0 bottom-0 items-center justify-center">
          <OnboardingArt
            variant="welcome"
            color={palette.accent}
            onColor={palette.onAccent}
            size={size}
          />
        </View>
      ) : null}
    </View>
  )
}

interface RestoreLineProps {
  palette: Palette
  onPress: () => void
}

/** "Already using Ihsaanly? Sign in": one line, one target, read as one name. */
function RestoreLine({ palette, onPress }: RestoreLineProps): ReactElement {
  const colors = useColors()
  const { onboarding } = useUi().strings
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${onboarding.restorePrompt} ${onboarding.restoreAction}`}
      onPress={onPress}
      className="shrink justify-center py-2"
      // A 44pt target, so a one-line link still clears WCAG 2.5.8.
      style={{ minHeight: 44 }}>
      <Text className="text-sm" style={{ color: colors.label }}>
        {onboarding.restorePrompt}{' '}
        <Text style={{ color: palette.accent, fontWeight: '700' }}>{onboarding.restoreAction}</Text>
      </Text>
    </Pressable>
  )
}

interface DotsProps {
  count: number
  index: number
}

function Dots({ count, index }: DotsProps): ReactElement {
  const colors = useColors()
  const accent = usePalette().accent
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
        ring={selected ? palette.accent : 'transparent'}
        style={{
          borderRadius: 20,
          paddingVertical: 20,
          paddingHorizontal: 12,
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

interface CaptionProps {
  children: string
  color: ColorValue
}

/** The small capitals over each card: "WHERE IT COMES FROM", "RIGHT NOW". */
function Caption({ children, color }: CaptionProps): ReactElement {
  return (
    <Text className="font-semibold text-xs uppercase tracking-wide" style={{ color }}>
      {children}
    </Text>
  )
}

interface SourcedCardProps {
  caption: string
  body: string
  palette: Palette
  /** The reminder line is the item's own voice, so it is set in the serif. */
  quote?: boolean
}

function SourcedCard({ caption, body, palette, quote = false }: SourcedCardProps): ReactElement {
  const colors = useColors()
  return (
    <Surface style={{ borderRadius: 20, padding: 16 }}>
      <View className="gap-1.5">
        <Caption color={palette.accent}>{caption}</Caption>
        <Text
          className={quote ? 'text-lg leading-snug' : 'text-sm leading-snug'}
          style={{
            color: colors.label,
            fontFamily: quote ? serif : undefined,
            fontWeight: quote ? '600' : undefined,
          }}>
          {body}
        </Text>
      </View>
    </Surface>
  )
}

interface WidgetMocksProps {
  preview: WidgetPreview
  palette: Palette
}

/**
 * The three places Ihsaanly can live outside the app, drawn from today's plan
 * as the gallery draws them: the Right now widget on a Home Screen with the
 * app's name under it, the next prayer on a Lock Screen under the clock, and
 * the reminder that would arrive.
 */
function WidgetMocks({ preview, palette }: WidgetMocksProps): ReactElement {
  const { strings } = useUi()
  const { home, lock } = preview
  const ink = previewInkFor(palette)
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View
          accessibilityLabel={strings.onboarding.widgetHome}
          testID="home-widget-preview"
          className="flex-1 overflow-hidden"
          style={{ borderRadius: 22 }}>
          <WidgetScene
            placement="home"
            platform="ios"
            ink={ink}
            fit={WIDGET_POINTS.small.width}
            appName={APP_NAME}>
            {(scale) => {
              const look: WidgetLook = { ink, platform: 'ios', lock: false, scale }
              return (
                <WidgetFrame look={look} family="small">
                  <WidgetText
                    look={look}
                    text={home.caption}
                    size="caption"
                    tone="accent"
                    weight="semibold"
                  />
                  <WidgetText look={look} text={home.title} size="headline" lines={3} />
                  {home.detail ? (
                    <WidgetText
                      look={look}
                      text={home.detail}
                      size="caption"
                      tone="secondary"
                      lines={2}
                    />
                  ) : null}
                </WidgetFrame>
              )
            }}
          </WidgetScene>
        </View>
        <View
          accessibilityLabel={strings.onboarding.widgetLock}
          testID="lock-widget-preview"
          className="flex-1 overflow-hidden"
          style={{ borderRadius: 22 }}>
          <WidgetScene
            placement="lock"
            platform="ios"
            ink={ink}
            fit={WIDGET_POINTS.rectangular.width}>
            {(scale) => {
              const look: WidgetLook = { ink: LOCK_INK, platform: 'ios', lock: true, scale }
              return (
                <LockFrame look={look} family="rectangular">
                  <WidgetText look={look} text={lock.title} size="headline" />
                  <WidgetText
                    look={look}
                    text={lock.detail}
                    size="caption"
                    tone="secondary"
                    lines={2}
                  />
                </LockFrame>
              )
            }}
          </WidgetScene>
        </View>
      </View>
      <NotificationMock
        title={preview.notification.title}
        body={preview.notification.body}
        actions={[strings.notifications.action.done, strings.notifications.action.later]}
      />
    </View>
  )
}

interface WidgetGuideSheetProps {
  guide: WidgetGuide
  palette: Palette
  onClose: () => void
}

/**
 * "Show me how": the platform's own steps for adding a widget, the Lock
 * Screen's too on iOS, under the Right now widget as it stands, drawn live.
 * Done returns to the step; the gallery in More shows every widget.
 */
function WidgetGuideSheet({ guide, palette, onClose }: WidgetGuideSheetProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const copy = strings.widgetGallery
  const name = copy.widgets.rightNow.name
  const sections =
    guide.platform === 'android'
      ? [{ title: null, steps: copy.androidSteps }]
      : [
          { title: copy.homeScreen, steps: copy.iosHomeSteps },
          { title: copy.lockScreen, steps: copy.iosLockSteps },
        ]
  return (
    <PageSheet
      title={strings.onboarding.widgetGuideTitle}
      closeLabel={strings.onboarding.widgetGuideDone}
      onClose={onClose}
      accent={palette.accent}
      onAccent={palette.onAccent}>
      <View className="gap-5 pb-2">
        <View className="items-center gap-2 pt-2">
          <LiveWidget
            widget="rightNow"
            family="small"
            model={guide.model}
            label={copy.preview(name)}
          />
          <Text className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
            {copy.updates}
          </Text>
        </View>
        {sections.map((section) => (
          <View key={section.title ?? 'steps'} className="gap-2">
            {section.title ? (
              <Text
                accessibilityRole="header"
                aria-level={2}
                className="font-semibold text-xs uppercase tracking-wide"
                style={{ color: colors.secondaryLabel }}>
                {section.title}
              </Text>
            ) : null}
            <NumberedSteps steps={section.steps} />
          </View>
        ))}
      </View>
    </PageSheet>
  )
}

interface SummaryLine {
  id: SetupRowId
  title: string
  status: string
  done: boolean
}

function summaryLines(props: OnboardingScreenProps, strings: Strings): SummaryLine[] {
  const { onboarding } = strings
  const { summary, status } = onboarding
  const paused = props.trackingPaused
  const presetName = props.preset ? onboarding[props.preset] : status.custom
  const lines: (SummaryLine | null)[] = [
    {
      id: 'location',
      title: summary.location,
      status: props.place ? cityOf(props.place.label) : status.later,
      done: props.place !== null,
    },
    {
      id: 'reminders',
      title: summary.reminders,
      status: remindersOn(props.notifications) ? status.on : status.later,
      done: remindersOn(props.notifications),
    },
    {
      id: 'tracking',
      title: summary.tracking,
      status: paused ? status.paused : status.on,
      done: !paused,
    },
    {
      id: 'start',
      title: summary.start,
      status: `${presetName} · ${onboarding.sunnahCount(props.enabledCount)}`,
      done: true,
    },
    {
      id: 'accent',
      title: summary.accent,
      status: strings.appearance.accents[props.accent],
      done: true,
    },
    props.widgetGuide
      ? { id: 'widgets', title: summary.widgets, status: status.addNow, done: false }
      : null,
    {
      id: 'language',
      title: summary.language,
      status: strings.language.names[props.language],
      done: true,
    },
  ]
  return lines.filter((line): line is SummaryLine => line !== null)
}

interface SummaryRowProps {
  line: SummaryLine
  palette: Palette
  last: boolean
  onPress: () => void
}

/** One line of the summary: a check (or an open ring), the setting, and where it stands. */
function SummaryRow({ line, palette, last, onPress }: SummaryRowProps): ReactElement {
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line.title}, ${line.status}`}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3"
      style={{
        minHeight: 44,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
      }}>
      <View
        className="items-center justify-center"
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: line.done ? 0 : 1.5,
          borderColor: palette.accent,
          backgroundColor: line.done ? palette.accent : undefined,
        }}>
        {line.done ? (
          <Text className="font-bold text-xs" style={{ color: palette.onAccent }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text className="font-medium text-base" style={{ color: colors.label }}>
        {line.title}
      </Text>
      <Text
        numberOfLines={1}
        className="flex-1 text-end text-sm"
        style={{ color: line.done ? colors.secondaryLabel : palette.accent }}>
        {line.status}
      </Text>
    </Pressable>
  )
}

interface FreeCardProps {
  palette: Palette
  onAbout: () => void
}

/** The honest close: no trial, no subscription, and where the support comes from. */
function FreeCard({ palette, onAbout }: FreeCardProps): ReactElement {
  const colors = useColors()
  const { onboarding } = useUi().strings
  return (
    <Surface style={{ borderRadius: 20, padding: 16 }}>
      <View className="gap-1">
        <Text
          className="text-lg"
          style={{ color: colors.label, fontFamily: serif, fontWeight: '600' }}>
          {onboarding.freeTitle}
        </Text>
        <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
          {onboarding.freeBody}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={onAbout}
          className="justify-center self-start"
          style={{ minHeight: 44 }}>
          <Text className="font-semibold text-sm" style={{ color: palette.accent }}>
            {onboarding.freeLink}
          </Text>
        </Pressable>
      </View>
    </Surface>
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
          <WelcomeArt palette={palette} />
          <View className="gap-2">
            <Heading
              title={strings.onboarding.welcomeTitle}
              body={strings.onboarding.welcomeBody}
            />
            <Text className="font-semibold text-sm" style={{ color: palette.accent }}>
              {strings.onboarding.free}
            </Text>
          </View>
          <View className="w-full flex-row gap-3" style={{ maxWidth: 480 }}>
            <View className="flex-1">
              <Field label={strings.onboarding.language}>
                <Dropdown
                  label={strings.onboarding.language}
                  value={props.language}
                  options={SUPPORTED_LANGUAGES.map((option) => ({
                    value: option,
                    label: strings.language.names[option],
                  }))}
                  onChange={props.onSelectLanguage}
                  accent={palette.accent}
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label={strings.onboarding.appearance}>
                <Dropdown
                  label={strings.onboarding.appearance}
                  value={props.theme}
                  options={THEME_PREFERENCES.map((option) => ({
                    value: option,
                    label: strings.appearance[option],
                  }))}
                  onChange={props.onSelectTheme}
                  accent={palette.accent}
                />
              </Field>
            </View>
          </View>
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
            <OnboardingArt
              variant="how"
              color={palette.accent}
              onColor={palette.onAccent}
              checkLabel={strings.onboarding.howExample}
            />
          </View>
          <Text
            className="text-center text-3xl leading-tight"
            style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
            {strings.onboarding.howTitle}
          </Text>
        </>
      )

    case 'sourced': {
      const example = props.sourced
      return (
        <>
          <Text
            accessibilityRole="header"
            className="text-4xl leading-tight"
            style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
            {strings.onboarding.sourcedTitle}
          </Text>
          {example ? (
            <View className="gap-3">
              {example.reminder ? (
                <SourcedCard
                  caption={strings.onboarding.sourcedSee}
                  body={example.reminder}
                  palette={palette}
                  quote
                />
              ) : null}
              <SourcedCard
                caption={strings.onboarding.sourcedFrom}
                body={citationFor(example.evidence, strings)}
                palette={palette}
              />
              {example.why ? (
                <SourcedCard
                  caption={strings.onboarding.sourcedWhy}
                  body={example.why}
                  palette={palette}
                />
              ) : null}
            </View>
          ) : null}
        </>
      )
    }

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
            label={strings.location.searchLabel}
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
          {/* The privacy line sits with the heading, before anything is chosen. */}
          <View className="gap-3">
            <Heading title={strings.onboarding.genderStep} body={strings.onboarding.genderWhy} />
            <Text className="text-xs leading-snug" style={{ color: colors.secondaryLabel }}>
              {strings.onboarding.genderPrivacy}
            </Text>
          </View>
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
        </>
      )

    case 'reminders': {
      const daily = props.notifications.windows || props.notifications.lookAhead
      const announcements = props.announcements
      const preview = props.reminderPreview
      const { action } = strings.notifications

      return (
        <>
          <Heading
            title={strings.onboarding.remindersStep}
            body={preview ? strings.onboarding.remindersTick : strings.onboarding.remindersWhy}
          />
          {preview ? (
            <View className="gap-3">
              <NotificationMock
                title={preview.item.title}
                body={preview.item.body}
                actions={[action.done, action.later]}
              />
              <NotificationMock
                title={preview.prayer.title}
                body={preview.prayer.body}
                actions={[action.prayed, action.notYet]}
              />
            </View>
          ) : null}
          <SwitchRow
            title={strings.onboarding.dailyReminders}
            detail={strings.onboarding.dailyRemindersDetail}
            value={daily}
            onValueChange={props.onToggleReminders}
            accent={palette.accent}
            knob={palette.knob}
            track={palette.wash[1]}
          />
          <SwitchRow
            title={strings.onboarding.prayerReminders}
            detail={strings.onboarding.prayerRemindersDetail}
            value={props.notifications.prayers}
            onValueChange={props.onTogglePrayers}
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
        </>
      )
    }

    case 'start':
      return (
        <>
          <Heading title={strings.onboarding.startStep} body={strings.onboarding.startWhy} />
          <ChoiceRow
            title={strings.onboarding.starting}
            detail={strings.onboarding.startingDetail}
            selected={props.preset === 'starting'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('starting')}
          />
          <ChoiceRow
            title={strings.onboarding.essentials}
            detail={strings.onboarding.essentialsDetail}
            selected={props.preset === 'essentials'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('essentials')}
          />
          <ChoiceRow
            title={strings.onboarding.everything}
            detail={strings.onboarding.everythingDetail}
            selected={props.preset === 'everything'}
            accent={palette.accent}
            onPress={() => props.onSelectPreset('everything')}
          />
        </>
      )

    case 'accent':
      return (
        <>
          <Heading title={strings.onboarding.accentStep} body={strings.onboarding.accentWhy} />
          <AccentPicker value={props.accent} onSelect={props.onSelectAccent} />
        </>
      )

    case 'widgets':
      return (
        <>
          <Heading title={strings.onboarding.widgetsStep} body={strings.onboarding.widgetsWhy} />
          {props.widgetPreview ? (
            <WidgetMocks preview={props.widgetPreview} palette={palette} />
          ) : null}
          {props.widgetGuide ? (
            <View className="items-center">
              <Button
                variant="secondary"
                title={strings.onboarding.showMeHow}
                onPress={props.onShowWidgets}
                color={palette.accent}
              />
            </View>
          ) : null}
          {props.widgetGuide?.open ? (
            <WidgetGuideSheet
              guide={props.widgetGuide}
              palette={palette}
              onClose={props.onCloseWidgets}
            />
          ) : null}
        </>
      )

    case 'summary': {
      const lines = summaryLines(props, strings)
      return (
        <>
          <Heading title={strings.onboarding.summaryTitle} body={strings.onboarding.summaryWhy} />
          <Surface style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 }}>
            {lines.map((line, position) => (
              <SummaryRow
                key={line.id}
                line={line}
                palette={palette}
                last={position === lines.length - 1}
                onPress={() => props.onOpenSetting(line.id)}
              />
            ))}
          </Surface>
          <FreeCard palette={palette} onAbout={props.onOpenAbout} />
        </>
      )
    }

    default:
      return assertNever(step)
  }
}

export function OnboardingScreen(props: OnboardingScreenProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const palette = usePalette()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  const { step } = props
  const intro = step === 'welcome' || step === 'how' || step === 'sourced'
  const asking = step === 'reminders' && wantsNotifications(props)
  const needsPlace = step === 'location' && props.place === null

  // Every way past a step sits beside Back, so the footer is the same height
  // on every step and the primary button never moves under the thumb.
  const escape = intro
    ? { title: strings.onboarding.skipIntro, onPress: props.onSkipIntro }
    : asking
      ? { title: strings.onboarding.notNow, onPress: props.onNotNow }
      : needsPlace
        ? { title: strings.onboarding.skipLocation, onPress: props.onNext }
        : null

  const primary =
    step === 'summary'
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
        className="flex-row items-center justify-between gap-4 px-4"
        style={{ paddingTop: insets.top, minHeight: insets.top + 48 }}>
        {/* Restore takes Back's place on the first step, so the footer never shifts. */}
        {step === 'welcome' && props.onRestore ? (
          <RestoreLine palette={palette} onPress={props.onRestore} />
        ) : props.stepIndex > 0 ? (
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
        </View>
      </View>
    </View>
  )
}
