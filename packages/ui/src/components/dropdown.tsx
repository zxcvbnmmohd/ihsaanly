import { type ReactElement, useState } from 'react'
import { type ColorValue, Pressable, ScrollView, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import { ChoiceRow } from './choice-row'
import { Sheet } from './sheet'

interface DropdownOption<T extends string> {
  value: T
  label: string
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

/**
 * One choice of several, shown as a field with the current value. Pressing it
 * opens the options in a Sheet (a bottom sheet on a phone), so iOS and Android
 * behave alike without a native module. The web twin is a plain `<select>`.
 */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  accent,
}: DropdownProps<T>): ReactElement {
  const [thing, setThing] = useState<Thing>({ open: false })
  const { systemColors } = useUi()
  const colors = useColors()
  const current = options.find((option) => option.value === value)?.label ?? value

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
        <Text numberOfLines={1} className="flex-1 text-base" style={{ color: colors.label }}>
          {current}
        </Text>
        <Chevron color={systemColors.secondaryLabel} />
      </Pressable>
      {thing.open ? (
        <Sheet title={label} onClose={() => setThing({ open: false })}>
          {/* Ten languages outgrow a small phone, so the list scrolls inside the sheet. */}
          <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="gap-2">
            {options.map((option) => (
              <ChoiceRow
                key={option.value}
                title={option.label}
                selected={option.value === value}
                accent={accent}
                onPress={() => {
                  setThing({ open: false })
                  if (option.value !== value) onChange(option.value)
                }}
              />
            ))}
          </ScrollView>
        </Sheet>
      ) : null}
    </>
  )
}
