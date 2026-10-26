import type { ReactElement } from 'react'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { Chip } from '../components/chip'
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
import { serif } from '../fonts'
import { useUi } from '../provider'

export type WidgetPlacement = 'home' | 'lock'

export interface WidgetsScreenProps {
  /** The widgets' current timeline entry, so every preview says what the real one says now. */
  model: WidgetPreviewModel
  /** Which steps to show, and whether there is a Lock Screen to preview (iOS only). */
  platform: 'ios' | 'android'
}

interface Thing {
  placement: WidgetPlacement
  home: HomeFamily
  lock: LockFamily
}

/**
 * More → Widgets: every widget, drawn live from the same timeline entry the
 * widgets show, with what each is for, what can be tapped on it and how to
 * put it on the Home Screen or Lock Screen.
 */
export function WidgetsScreen({ model, platform }: WidgetsScreenProps): ReactElement {
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

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <Text className="text-base" style={{ color: colors.label }}>
        {copy.intro}
      </Text>
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

      {widgets.map((widget) => {
        const about = copy.widgets[widget]
        return (
          <Surface key={widget} style={{ borderRadius: 24 }}>
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
              <View className="items-center">
                <WidgetPreview
                  widget={widget}
                  family={family}
                  model={model}
                  label={copy.preview(about.name)}
                />
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
        <View role="list" className="gap-2">
          {steps.map((step, index) => (
            <View key={step} role="listitem" className="flex-row gap-3">
              <Text
                className="text-base"
                style={{ fontFamily: serif, color: palette.accent, fontWeight: '600' }}>
                {index + 1}
              </Text>
              <Text className="flex-1 text-base leading-relaxed" style={{ color: colors.label }}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  )
}
