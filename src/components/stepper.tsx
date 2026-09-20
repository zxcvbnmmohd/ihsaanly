import * as Haptics from 'expo-haptics'
import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { colors, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

interface StepperProps {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
  palette: Palette
}

/** A count nudged up or down one at a time. Big targets, no typing. */
export function Stepper({ label, value, min = 0, onChange, palette }: StepperProps): ReactElement {
  useColorScheme()

  const step = (delta: number): void => {
    const next = Math.max(min, value + delta)
    if (next === value) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onChange(next)
  }

  const control = (glyph: string, delta: number, disabled: boolean): ReactElement => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${glyph}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => step(delta)}
      className="items-center justify-center rounded-full"
      style={{
        width: 44,
        height: 44,
        borderWidth: 1.5,
        borderColor: palette.accent,
        opacity: disabled ? 0.35 : 1,
      }}>
      <Text className="text-xl" style={{ color: palette.accent, lineHeight: 24 }}>
        {glyph}
      </Text>
    </Pressable>
  )

  return (
    <View className="flex-row items-center gap-4">
      <Text className="flex-1 text-base" style={{ color: colors.label }}>
        {label}
      </Text>
      {control('−', -1, value <= min)}
      <Text
        accessibilityLiveRegion="polite"
        className="text-2xl"
        style={{
          color: colors.label,
          fontFamily: fonts.display,
          minWidth: 36,
          textAlign: 'center',
        }}>
        {value}
      </Text>
      {control('+', 1, false)}
    </View>
  )
}
