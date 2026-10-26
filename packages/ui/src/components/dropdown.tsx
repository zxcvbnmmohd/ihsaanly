import { type ReactElement, useState } from 'react'
import { type ColorValue, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors, useSystemColors } from '../colors'
import { serif } from '../fonts'
import { useUi } from '../provider'
import { ChoiceRow } from './choice-row'
import { useRecede } from './recede'
import { Sheet } from './sheet'

/** One dot of a swatch: a ground and a mark on it, such as a theme's wash and accent. */
export interface SwatchDot {
  ground: string
  mark: string
}

interface DropdownOption<T extends string> {
  value: T
  label: string
  /** Dots drawn before the label, in the field and the list; the web's `<select>` cannot. */
  swatch?: readonly SwatchDot[]
}

export interface DropdownProps<T extends string> {
  /** The accessible name, and the sheet's title. The visible label is the host's. */
  label: string
  value: T
  options: readonly DropdownOption<T>[]
  onChange: (value: T) => void
  /** Ring colour of the chosen option. Defaults to the system tint. */
  accent?: ColorValue
}

interface Thing {
  open: boolean
}

/** A chevron drawn from two views, so it needs no icon font. */
function Chevron({ color }: { color: ColorValue }): ReactElement {
  const arm = { width: 8, height: 2, borderRadius: 1, backgroundColor: color }
  return (
    <View aria-hidden style={{ width: 14, height: 8 }}>
      <View
        style={[arm, { position: 'absolute', top: 3, start: 0, transform: [{ rotate: '40deg' }] }]}
      />
      <View
        style={[arm, { position: 'absolute', top: 3, end: 0, transform: [{ rotate: '-40deg' }] }]}
      />
    </View>
  )
}

interface SwatchProps {
  dots: readonly SwatchDot[]
}

/** A colour sample: a circle per dot in its ground, the mark at its centre. */
function Swatch({ dots }: SwatchProps): ReactElement {
  const colors = useColors()
  return (
    <View aria-hidden testID="dropdown-swatch" className="flex-row">
      {dots.map((dot, index) => (
        <View
          key={`${dot.ground}${dot.mark}`}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            marginStart: index === 0 ? 0 : -8,
            backgroundColor: dot.ground,
            borderWidth: 1,
            borderColor: colors.fieldBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot.mark }} />
        </View>
      ))}
    </View>
  )
}

interface OptionsProps {
  title: string
  onClose: () => void
  children: ReactElement
}

/**
 * iOS's own page sheet, which a swipe down closes; Android has no such
 * presentation, so it keeps the shared Sheet. On both the app behind steps
 * back as a card (RecedeProvider) and stays in view.
 */
function Options({ title, onClose, children }: OptionsProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const insets = useSafeAreaInsets()
  useRecede()

  if (process.env.EXPO_OS !== 'ios') {
    return (
      <Sheet title={title} onClose={onClose}>
        {/* Ten languages outgrow a small phone, so the list scrolls inside the sheet. */}
        <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="gap-2">
          {children}
        </ScrollView>
      </Sheet>
    )
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      // Also what a swipe down calls, so the host's state follows the sheet.
      onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: colors.paper }}>
        <View className="flex-row items-center gap-3 px-5 pt-5 pb-3">
          <Text
            accessibilityRole="header"
            className="flex-1 font-semibold text-xl"
            style={{ fontFamily: serif, color: colors.label }}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={12}
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text className="font-semibold text-base" style={{ color: colors.accent }}>
              {strings.panel.close}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerClassName="gap-2 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}

/**
 * One choice of several, shown as a field with the current value. Pressing it
 * opens the options in a page sheet on iOS and the shared Sheet elsewhere,
 * without a native module. The web twin is a plain `<select>`.
 */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  accent,
}: DropdownProps<T>): ReactElement {
  const [thing, setThing] = useState<Thing>({ open: false })
  const systemColors = useSystemColors()
  const colors = useColors()
  const chosen = options.find((option) => option.value === value)
  const current = chosen?.label ?? value

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current }}
        accessibilityState={{ expanded: thing.open }}
        onPress={() => setThing({ open: true })}
        className="flex-row items-center gap-2 rounded-2xl ps-4 pe-3"
        style={{
          backgroundColor:
            process.env.EXPO_OS === 'android'
              ? colors.surface
              : systemColors.secondarySystemBackground,
          minHeight: 52,
          borderWidth: 1.5,
          borderColor: colors.fieldBorder,
          borderCurve: 'continuous',
        }}>
        {chosen?.swatch ? <Swatch dots={chosen.swatch} /> : null}
        <Text numberOfLines={1} className="flex-1 text-base" style={{ color: colors.label }}>
          {current}
        </Text>
        <Chevron color={systemColors.secondaryLabel} />
      </Pressable>
      {thing.open ? (
        <Options title={label} onClose={() => setThing({ open: false })}>
          <>
            {options.map((option) => (
              <ChoiceRow
                key={option.value}
                title={option.label}
                selected={option.value === value}
                accent={accent}
                leading={option.swatch ? <Swatch dots={option.swatch} /> : undefined}
                onPress={() => {
                  setThing({ open: false })
                  if (option.value !== value) onChange(option.value)
                }}
              />
            ))}
          </>
        </Options>
      ) : null}
    </>
  )
}
