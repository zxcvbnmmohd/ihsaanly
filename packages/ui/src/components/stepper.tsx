import type { Palette } from '@ihsaanly/tailwind/tokens'
import * as Haptics from 'expo-haptics'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { serif } from '../fonts'

interface StepperProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  palette: Palette
}

/** A count nudged up or down one at a time. Big targets, no typing. */
export function Stepper({
  label,
  value,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  onChange,
  palette,
}: StepperProps): ReactElement {
  const colors = useColors()

  const step = (delta: number): void => {
    const next = Math.min(max, Math.max(min, value + delta))
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
        borderColor: palette.accent,
        minWidth: 44,
        minHeight: 44,
        borderWidth: 1.5,
        opacity: disabled ? 0.35 : 1,
      }}>
      <Text
        className="text-xl"
        maxFontSizeMultiplier={2}
        style={{ color: palette.accent, lineHeight: 24 }}>
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
          fontFamily: serif,
          minWidth: 36,
          textAlign: 'center',
        }}>
        {value}
      </Text>
      {control('+', 1, value >= max)}
    </View>
  )
}
