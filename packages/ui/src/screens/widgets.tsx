import type { ReactElement } from 'react'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { Chip } from '../components/chip'
import { CoachMark } from '../components/coach-mark'
import { NumberedSteps } from '../components/numbered-steps'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import {
  GALLERY_WIDGETS,
  HOME_FAMILIES,
  type HomeFamily,
  LOCK_FAMILIES,
  LOCK_FAMILIES_BY_WIDGET,
  type LockFamily,
  WidgetPreview,
  type WidgetPreviewModel,
} from '../components/widget-preview'
import { APP_NAME, AppIcon } from '../components/widget-scene'
import { serif } from '../fonts'
import { useUi } from '../provider'

export type WidgetPlacement = 'home' | 'lock'

/** What a first-use coach mark on the gallery points at: the size chips, then the first preview. */
export type WidgetsCoachTarget = 'choose' | 'preview'

/** One step of the gallery's first-use tour; the route decides the steps and keeps the place. */
export interface WidgetsCoach {
  target: WidgetsCoachTarget
  /** 0-based. */
  step: number
  total: number
  onNext: () => void
  onSkip: () => void
}

export interface WidgetsScreenProps {
  /** The widgets' current timeline entry, so every preview says what the real one says now. */
  model: WidgetPreviewModel
  /** Which steps to show, and whether there is a Lock Screen to preview (iOS only). */
  platform: 'ios' | 'android'
  /** The first-use tour's step, or null when it is not showing. */
  coach?: WidgetsCoach | null
}

interface Thing {
  placement: WidgetPlacement
  home: HomeFamily
  lock: LockFamily
}

/**
 * More → Widgets, laid out like the system's own widget sheet: the app's icon,
 * name and what its widgets are for, then every widget drawn live from the
 * timeline entry the widgets show, on a Home or Lock Screen wallpaper, with
 * what each is for, what can be tapped on it and how to add it.
 */
export function WidgetsScreen({ model, platform, coach = null }: WidgetsScreenProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ placement: 'home', home: 'small', lock: 'circular' })
  const colors = useColors()
  const palette = usePalette()
  const { strings } = useUi()
  const copy = strings.widgetGallery
  // Android has no Lock Screen widgets, so it has nothing to switch to.
  const placement = platform === 'ios' ? thing.placement : 'home'
  const family = placement === 'home' ? thing.home : thing.lock
  const widgets = GALLERY_WIDGETS.filter(
    (widget) => placement === 'home' || LOCK_FAMILIES_BY_WIDGET[widget].includes(thing.lock),
  )
  const steps =
    platform === 'android'
      ? copy.androidSteps
      : placement === 'lock'
        ? copy.iosLockSteps
        : copy.iosHomeSteps

  // Drawn in the flow just under what it explains, as Today's tour is.
  const coachUnder = (target: WidgetsCoachTarget): ReactElement | null =>
    coach?.target === target ? (
      <CoachMark
        text={target === 'choose' ? strings.tour.galleryChoose : strings.tour.galleryLive}
        step={coach.step}
        total={coach.total}
        onNext={coach.onNext}
        onSkip={coach.onSkip}
        arrowAt={target === 'choose' ? 40 : '50%'}
      />
    ) : null

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <View className="flex-row items-center gap-4">
        <AppIcon size={64} />
        <View className="flex-1 gap-1">
          <Text
            accessibilityRole="header"
            aria-level={1}
            className="font-bold text-2xl"
            style={{ color: colors.label }}>
            {APP_NAME}
          </Text>
          <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
            {copy.intro}
          </Text>
        </View>
      </View>
      <Text className="font-semibold text-sm" style={{ color: palette.accentInk }}>
        {copy.updates}
      </Text>

      {platform === 'ios' ? (
        <View role="group" aria-label={copy.placement} className="flex-row flex-wrap gap-2">
          {(['home', 'lock'] as const).map((option) => (
            <Chip
              key={option}
              label={option === 'home' ? copy.homeScreen : copy.lockScreen}
              selected={placement === option}
              onPress={() => setThing((current) => ({ ...current, placement: option }))}
              palette={palette}
            />
          ))}
        </View>
      ) : null}
      <View role="group" aria-label={copy.size} className="flex-row flex-wrap gap-2">
        {placement === 'home'
          ? HOME_FAMILIES.map((option) => (
              <Chip
                key={option}
                label={copy[option]}
                selected={thing.home === option}
                onPress={() => setThing((current) => ({ ...current, home: option }))}
                palette={palette}
              />
            ))
          : LOCK_FAMILIES.map((option) => (
              <Chip
                key={option}
                label={copy[option]}
                selected={thing.lock === option}
                onPress={() => setThing((current) => ({ ...current, lock: option }))}
                palette={palette}
              />
            ))}
      </View>
      {coachUnder('choose')}

      {widgets.map((widget, index) => {
        const about = copy.widgets[widget]
        return (
          <View key={widget} className="gap-4">
            <Surface style={{ borderRadius: 24, overflow: 'hidden' }}>
              <WidgetPreview
                widget={widget}
                family={family}
                model={model}
                label={copy.preview(about.name)}
                platform={platform}
              />
              <View className="gap-3 p-4">
                <View className="gap-1">
                  <Text
                    accessibilityRole="header"
                    aria-level={2}
                    className="font-semibold text-lg"
                    style={{ color: colors.label, fontFamily: serif }}>
                    {about.name}
                  </Text>
                  <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
                    {about.purpose}
                  </Text>
                </View>
                <View className="gap-1">
                  <Text
                    className="font-semibold text-xs uppercase"
                    style={{ color: palette.accentInk }}>
                    {copy.tap}
                  </Text>
                  <Text className="text-sm" style={{ color: colors.label }}>
                    {about.taps}
                  </Text>
                </View>
              </View>
            </Surface>
            {index === 0 ? coachUnder('preview') : null}
          </View>
        )
      })}

      <View className="gap-3 pt-2">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {copy.howToAdd}
        </Text>
        <NumberedSteps steps={steps} />
      </View>
    </Screen>
  )
}
